import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_DEFINITIONS } from "../src/lib/auth/permission-catalog";

const prisma = new PrismaClient();

const DEV_USERS = [
  {
    name: "Dev Owner",
    email: "owner@panasea.dev",
    password: "Owner#12345",
    roleName: "OWNER" as const,
  },
  {
    name: "Dev Cashier",
    email: "cashier@panasea.dev",
    password: "Cashier#12345",
    roleName: "CASHIER" as const,
  },
];

async function main() {
  console.log("Seeding permissions...");
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  console.log("Seeding roles + role-permission grants...");
  for (const roleDef of Object.values(ROLE_DEFINITIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    // Reset then reconnect so re-running the seed keeps grants in sync
    // with permission-catalog.ts instead of only ever adding to them.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const key of roleDef.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key },
      });
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding development users...");
  let ownerUserId = "";
  for (const devUser of DEV_USERS) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: devUser.roleName },
    });
    const passwordHash = await bcrypt.hash(devUser.password, 10);

    const user = await prisma.user.upsert({
      where: { email: devUser.email },
      update: { passwordHash, roleId: role.id, isActive: true },
      create: {
        name: devUser.name,
        email: devUser.email,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
    });
    if (devUser.roleName === "OWNER") ownerUserId = user.id;
  }

  console.log("Seeding units...");
  const gram = await prisma.unit.upsert({
    where: { name: "Gram" },
    update: {},
    create: { name: "Gram", symbol: "g", type: "WEIGHT", conversionToBase: 1 },
  });
  const kilogram = await prisma.unit.upsert({
    where: { name: "Kilogram" },
    update: {},
    create: { name: "Kilogram", symbol: "kg", type: "WEIGHT", baseUnitId: gram.id, conversionToBase: 1000 },
  });
  const mililiter = await prisma.unit.upsert({
    where: { name: "Mililiter" },
    update: {},
    create: { name: "Mililiter", symbol: "ml", type: "VOLUME", conversionToBase: 1 },
  });
  const liter = await prisma.unit.upsert({
    where: { name: "Liter" },
    update: {},
    create: { name: "Liter", symbol: "l", type: "VOLUME", baseUnitId: mililiter.id, conversionToBase: 1000 },
  });
  const pcs = await prisma.unit.upsert({
    where: { name: "Pcs" },
    update: {},
    create: { name: "Pcs", symbol: "pcs", type: "COUNT", conversionToBase: 1 },
  });

  console.log("Seeding categories...");
  const categoryNames = ["Coffee", "Non-Coffee", "Tea", "Pastry", "Food"];
  const categories: Record<string, { id: string }> = {};
  for (const name of categoryNames) {
    categories[name] = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seeding products + variants...");
  const productDefs = [
    { name: "Espresso", category: "Coffee", price: 18000 },
    { name: "Americano", category: "Coffee", price: 20000, variants: [25000] },
    { name: "Cappuccino", category: "Coffee", price: 25000, variants: [30000] },
    { name: "Latte", category: "Coffee", price: 25000, variants: [30000] },
    { name: "Mocha", category: "Coffee", price: 28000, variants: [33000] },
    { name: "Matcha Latte", category: "Non-Coffee", price: 27000, variants: [32000] },
    { name: "Chocolate", category: "Non-Coffee", price: 25000, variants: [30000] },
    { name: "Es Teh", category: "Tea", price: 12000 },
    { name: "Lemon Tea", category: "Tea", price: 15000 },
    { name: "Croissant", category: "Pastry", price: 22000 },
    { name: "Banana Bread", category: "Pastry", price: 20000 },
  ];
  const productIds: Record<string, string> = {};
  for (const def of productDefs) {
    let product = await prisma.product.findFirst({ where: { name: def.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: def.name,
          categoryId: categories[def.category]!.id,
          price: def.price,
        },
      });
    }
    productIds[def.name] = product.id;

    if (def.variants) {
      const existingVariants = await prisma.productVariant.count({ where: { productId: product.id } });
      if (existingVariants === 0) {
        await prisma.productVariant.create({
          data: { productId: product.id, name: "Regular", price: def.price },
        });
        for (const largePrice of def.variants) {
          await prisma.productVariant.create({
            data: { productId: product.id, name: "Large", price: largePrice },
          });
        }
      }
    }
  }

  console.log("Seeding add-ons + product-addon links...");
  const addonDefs = [
    { name: "Extra Shot", price: 5000 },
    { name: "Oat Milk Substitute", price: 8000 },
    { name: "Caramel Syrup", price: 5000 },
    { name: "Extra Ice", price: 2000 },
  ];
  const addonIds: Record<string, string> = {};
  for (const def of addonDefs) {
    const addon = await prisma.addon.upsert({ where: { name: def.name }, update: {}, create: def });
    addonIds[def.name] = addon.id;
  }
  const coffeeProducts = ["Espresso", "Americano", "Cappuccino", "Latte", "Mocha"];
  for (const productName of coffeeProducts) {
    for (const addonName of ["Extra Shot", "Oat Milk Substitute", "Caramel Syrup"]) {
      await prisma.productAddon.upsert({
        where: {
          productId_addonId: { productId: productIds[productName]!, addonId: addonIds[addonName]! },
        },
        update: {},
        create: { productId: productIds[productName]!, addonId: addonIds[addonName]! },
      });
    }
  }
  for (const productName of ["Es Teh", "Lemon Tea"]) {
    await prisma.productAddon.upsert({
      where: {
        productId_addonId: { productId: productIds[productName]!, addonId: addonIds["Extra Ice"]! },
      },
      update: {},
      create: { productId: productIds[productName]!, addonId: addonIds["Extra Ice"]! },
    });
  }

  console.log("Seeding ingredients + initial stock...");
  const ingredientDefs = [
    { name: "Coffee Beans", unit: kilogram, minimumStock: 2, initialStock: 8 },
    { name: "Fresh Milk", unit: liter, minimumStock: 5, initialStock: 15 },
    { name: "Oat Milk", unit: liter, minimumStock: 2, initialStock: 6 },
    { name: "Sugar", unit: kilogram, minimumStock: 3, initialStock: 10 },
    { name: "Chocolate Syrup", unit: liter, minimumStock: 1, initialStock: 3 },
    // Deliberately seeded BELOW minimum so the Low Stock feature has real
    // data to show right after seeding, without extra manual steps.
    { name: "Caramel Syrup", unit: liter, minimumStock: 1, initialStock: 0.5 },
    { name: "Ice", unit: kilogram, minimumStock: 5, initialStock: 20 },
    { name: "Cup 12oz", unit: pcs, minimumStock: 100, initialStock: 500 },
    { name: "Cup 16oz", unit: pcs, minimumStock: 100, initialStock: 300 },
    { name: "Lid", unit: pcs, minimumStock: 100, initialStock: 50 },
  ];
  for (const def of ingredientDefs) {
    const existing = await prisma.ingredient.findUnique({ where: { name: def.name } });
    if (existing) continue; // don't re-seed stock on top of real usage from re-runs

    const ingredient = await prisma.ingredient.create({
      data: {
        name: def.name,
        unitId: def.unit.id,
        minimumStock: def.minimumStock,
        currentStock: def.initialStock,
      },
    });
    // Recorded directly here (not through recordMovement()) because this
    // is one-time bootstrap data, not a runtime mutation — but it still
    // produces a real, consistent ledger entry, never a bare stock write
    // with no history.
    await prisma.inventoryMovement.create({
      data: {
        ingredientId: ingredient.id,
        type: "ADJUSTMENT_IN",
        quantity: def.initialStock,
        unitId: def.unit.id,
        referenceType: "INITIAL_STOCK",
        note: "Stok awal (seed)",
        createdById: ownerUserId,
      },
    });
  }

  console.log("Seeding suppliers...");
  const supplierDefs = [
    {
      name: "Kopi Nusantara Roastery",
      contactPerson: "Budi Santoso",
      phone: "0812-3456-7890",
      email: "order@kopinusantara.id",
      address: "Jl. Raya Ciwidey No. 12, Bandung",
    },
    {
      name: "Dairy Fresh Indonesia",
      contactPerson: "Sari Wulandari",
      phone: "0813-2233-4455",
      email: "sales@dairyfresh.co.id",
      address: "Jl. Industri Susu No. 5, Cimahi",
    },
    {
      name: "Toko Kemasan Jaya",
      contactPerson: "Hendra Gunawan",
      phone: "0857-1122-3344",
      email: null,
      address: "Jl. Kemasan Raya No. 8, Bandung",
    },
  ];
  for (const def of supplierDefs) {
    const existing = await prisma.supplier.findFirst({ where: { name: def.name } });
    if (!existing) {
      await prisma.supplier.create({ data: def });
    }
  }

  console.log("\nSeed selesai.\n");
  console.log("=".repeat(56));
  console.log("DEVELOPMENT LOGIN CREDENTIALS — JANGAN gunakan di production");
  for (const u of DEV_USERS) {
    console.log(`  ${u.roleName.padEnd(8)} ${u.email} / ${u.password}`);
  }
  console.log("=".repeat(56));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
