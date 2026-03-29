export type MenuProductOptionMode = "default" | "coffee" | "bakery" | "topping";

export type MenuProductOptionPolicy = {
  mode: MenuProductOptionMode;
  showSugar: boolean;
  showIce: boolean;
  showToppings: boolean;
  showNote: boolean;
};

const TOPPING_KEYWORDS = ["topping"];
const BAKERY_KEYWORDS = [
  "bakery",
  "pastry",
  "cake",
  "banh",
  "bread",
  "croissant",
  "muffin",
  "cookie",
  "donut",
  "brownie",
  "cheesecake",
  "tiramisu",
];
const COFFEE_KEYWORDS = [
  "coffee",
  "ca phe",
  "cafe",
  "caffe",
  "espresso",
  "americano",
  "cappuccino",
  "macchiato",
  "mocha",
  "cold brew",
  "phin",
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function includesAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function resolveMenuProductOptionPolicy(input: {
  categoryName?: unknown;
  productName?: unknown;
}): MenuProductOptionPolicy {
  const normalizedCategoryName = normalizeText(input.categoryName);
  const normalizedProductName = normalizeText(input.productName);
  const categoryOrName = normalizedCategoryName || normalizedProductName;

  const isToppingProduct = includesAnyKeyword(categoryOrName, TOPPING_KEYWORDS);
  if (isToppingProduct) {
    return {
      mode: "topping",
      showSugar: false,
      showIce: false,
      showToppings: false,
      showNote: true,
    };
  }

  const isBakeryProduct = includesAnyKeyword(categoryOrName, BAKERY_KEYWORDS);
  if (isBakeryProduct) {
    return {
      mode: "bakery",
      showSugar: false,
      showIce: false,
      showToppings: false,
      showNote: true,
    };
  }

  const isCoffeeProduct = includesAnyKeyword(categoryOrName, COFFEE_KEYWORDS);
  if (isCoffeeProduct) {
    return {
      mode: "coffee",
      showSugar: true,
      showIce: true,
      showToppings: false,
      showNote: true,
    };
  }

  return {
    mode: "default",
    showSugar: true,
    showIce: true,
    showToppings: true,
    showNote: true,
  };
}
