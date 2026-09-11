import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
} from "@/lib/validation/product";

interface ProductListParams {
  search?: string;
  categoryId?: string;
  status: "all" | "active" | "inactive";
  page: number;
  pageSize: number;
}

export async function listProducts(params: ProductListParams) {
  const where = {
    ...(params.search ? { name: { contains: params.search } } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.status === "active"
      ? { isActive: true }
      : params.status === "inactive"
        ? { isActive: false }
        : {}),
  };

  // Two queries instead of one N+1-prone fetch-everything-then-slice: the
  // count is cheap (indexed WHERE), and the page fetch stays small no
  // matter how large the catalog grows.
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { variants: true } },
      },
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function getProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { createdAt: "asc" } },
      addons: { include: { addon: true }, orderBy: { addon: { name: "asc" } } },
    },
  });
  if (!product) throw new NotFoundError("Produk");
  return product;
}

export async function createProduct(input: CreateProductInput) {
  return db.product.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description || null,
      sku: input.sku || null,
      price: input.price,
      costPrice: input.costPrice ?? null,
      imageUrl: input.imageUrl || null,
    },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  return db.product.update({
    where: { id },
    data: {
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.sku !== undefined ? { sku: input.sku || null } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteProduct(id: string) {
  // Variants and product-addon links cascade automatically (see schema).
  // No transaction/order history references products yet in this batch.
  await db.product.delete({ where: { id } });
}

export async function createVariant(productId: string, input: CreateVariantInput) {
  await db.product.findUniqueOrThrow({ where: { id: productId } });
  return db.productVariant.create({
    data: {
      productId,
      name: input.name,
      price: input.price,
      sku: input.sku || null,
    },
  });
}

export async function updateVariant(productId: string, variantId: string, input: UpdateVariantInput) {
  const variant = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || variant.productId !== productId) throw new NotFoundError("Variant");

  return db.productVariant.update({
    where: { id: variantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.sku !== undefined ? { sku: input.sku || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteVariant(productId: string, variantId: string) {
  const variant = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || variant.productId !== productId) throw new NotFoundError("Variant");
  await db.productVariant.delete({ where: { id: variantId } });
}

export async function attachAddons(productId: string, addonIds: string[]) {
  // skipDuplicates isn't available on SQLite, so upsert each link individually.
  await Promise.all(
    addonIds.map((addonId) =>
      db.productAddon.upsert({
        where: { productId_addonId: { productId, addonId } },
        update: {},
        create: { productId, addonId },
      })
    )
  );
  return getProduct(productId);
}

export async function detachAddon(productId: string, addonId: string) {
  await db.productAddon.delete({
    where: { productId_addonId: { productId, addonId } },
  });
}
