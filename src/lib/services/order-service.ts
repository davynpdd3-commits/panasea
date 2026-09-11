import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// DRAFT, HELD, OPEN, CANCELLED, COMPLETED
export type OrderStatus = "DRAFT" | "HELD" | "OPEN" | "CANCELLED" | "COMPLETED";

export interface CreateOrderInput {
  cashierId: string;
  status: OrderStatus;
  notes?: string;
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    notes?: string;
    addons: {
      addonId: string;
    }[];
  }[];
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

export async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const datePrefix = `PS-${year}${month}${day}`;

  const lastOrder = await db.order.findFirst({
    where: {
      orderNumber: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split("-")[2] || "0", 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${datePrefix}-${String(sequence).padStart(3, "0")}`;
}

export async function createOrder(input: CreateOrderInput) {
  // Validate and fetch prices from database (do not trust client)
  let subtotal = 0;
  
  const processedItems = await Promise.all(
    input.items.map(async (item) => {
      const product = await db.product.findUniqueOrThrow({
        where: { id: item.productId },
        include: { variants: true },
      });
      
      let unitPrice = product.price;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) throw new Error("Variant not found on product");
        unitPrice = variant.price;
      } else if (product.variants.length > 0) {
        throw new Error("Product requires variant selection");
      }

      let itemAddonsTotal = 0;
      const processedAddons = await Promise.all(
        item.addons.map(async (addonInput) => {
          const productAddon = await db.productAddon.findUnique({
            where: {
              productId_addonId: {
                productId: product.id,
                addonId: addonInput.addonId,
              },
            },
            include: { addon: true },
          });
          if (!productAddon) throw new Error("Addon not available for product");
          
          itemAddonsTotal += productAddon.addon.price;
          return {
            addonId: productAddon.addonId,
            price: productAddon.addon.price,
          };
        })
      );

      const lineTotal = (unitPrice + itemAddonsTotal) * item.quantity;
      subtotal += lineTotal;

      return {
        productId: product.id,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        unitPrice,
        notes: item.notes,
        lineTotal,
        addons: {
          create: processedAddons,
        },
      };
    })
  );

  const orderNumber = await generateOrderNumber();
  const grandTotal = subtotal; // Assuming no tax/discount implemented yet

  const order = await db.order.create({
    data: {
      orderNumber,
      status: input.status,
      cashierId: input.cashierId,
      subtotal,
      grandTotal,
      notes: input.notes,
      items: {
        create: processedItems,
      },
    },
    include: {
      payment: true,
      items: {
        include: {
          product: true,
          variant: true,
          addons: {
            include: {
              addon: true,
            },
          },
        },
      },
    },
  });

  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await db.order.update({
    where: { id: orderId },
    data: { status },
  });
  return order;
}

export async function getOrderById(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      items: {
        include: {
          product: true,
          variant: true,
          addons: {
            include: {
              addon: true,
            },
          },
        },
      },
      cashier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
