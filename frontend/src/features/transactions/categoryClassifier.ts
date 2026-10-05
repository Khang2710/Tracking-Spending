const CATEGORY_KEYWORDS: ReadonlyArray<readonly [category: string, keywords: readonly string[]]> = [
  ["Food", ["ăn", "cơm", "phở", "bún", "bánh", "hủ tiếu", "miến", "cháo", "lẩu", "nướng", "buffet", "nhà hàng", "quán ăn", "suất ăn", "đồ ăn", "snack", "pizza", "burger", "kfc", "lotte", "mcdonald", "jollibee", "texas chicken", "domino", "food", "lunch", "dinner", "breakfast", "meal", "dining", "restaurant", "eat", "noodle", "rice", "soup", "steak", "sushi", "bbq", "grabfood", "shopeefood", "baemin", "ốc", "bột chiên", "ramen", "dimsum"]],
  ["Drinks", ["uống", "trà", "trà sữa", "boba", "cf", "cafe", "cà phê", "nước", "sinh tố", "nước ép", "bia", "rượu", "pub", "bar", "highlands", "phúc long", "starbucks", "coffee", "katinat", "phê la", "tocotoco", "gong cha", "dingtea", "mixue", "coca", "pepsi", "sting", "latte", "matcha", "cappuccino", "drink", "drinks", "beverage", "juice", "smoothie", "beer", "wine", "soda", "water", "nước mía", "dừa", "quán nước"]],
  ["Groceries", ["đi chợ", "chợ", "siêu thị", "winmart", "bách hóa xanh", "coopmart", "lotte mart", "big c", "aeon", "circle k", "family mart", "7 eleven", "gs25", "thực phẩm", "rau", "củ", "quả", "trái cây", "thịt tươi", "cá tươi", "trứng", "sữa", "gạo", "mắm", "dầu ăn", "nhu yếu phẩm", "grocery", "groceries", "supermarket", "produce", "vegetables", "fruits", "dairy", "milk", "eggs", "bread", "pantry", "provisions"]],
  ["Shopping", ["shoppe", "shopee", "shop", "shoping", "shopping", "tiki", "lazada", "sendo", "amazon", "tiktok", "mua", "sắm", "mall", "boutique", "clothes", "áo", "quần", "giày", "dép", "túi", "ví", "store", "market", "fashion", "mỹ phẩm", "skincare", "nước hoa"]],
  ["Fuel", ["xe", "bus", "taxi", "grab", "be", "gojek", "xăng", "gas", "oil", "bãi xe", "gửi xe", "vé xe", "máy bay", "flight", "drive", "fuel", "đổ xăng", "rửa xe"]],
  ["Housing", ["nhà", "điện", "nước", "mạng", "wifi", "internet", "phòng", "rent", "house", "bill", "chung cư", "tiền nhà"]],
  ["Entertainment", ["chơi", "game", "phim", "netflix", "youtube", "spotify", "movie", "vé", "cgv", "bida", "karaoke", "du lịch", "steam", "nintendo", "playstation"]],
  ["Salary", ["lương", "thưởng", "salary", "bonus", "paycheck", "thu nhập"]],
  ["Bank", ["bank", "chuyển khoản", "rút tiền", "vcb", "tcb", "mbbank", "tpbank", "momo", "zalopay"]],
  ["Investment", ["chứng khoán", "coin", "crypto", "lãi", "tiết kiệm", "invest"]],
];

export function classifyTransactionCategory(title: string): string {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) return "Others";

  let bestMatch: { category: string; keywordLength: number } | null = null;

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (normalizedTitle.includes(keyword) && keyword.length > (bestMatch?.keywordLength ?? 0)) {
        bestMatch = { category, keywordLength: keyword.length };
      }
    }
  }

  return bestMatch?.category ?? "Others";
}
