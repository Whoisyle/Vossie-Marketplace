/**
 * Photos for the promo banners (licensed stock photos from Pexels, free to use without attribution; see
 * docs/product/photo-credits.md). Banners fall back to the product drawing when a product has no photo here.
 */
export const promoPhotos: Record<string, number> = {
  "burger-chips": require("../../../assets/banners/burger-chips.jpg"),
  "denim-jacket": require("../../../assets/banners/denim-jacket.jpg"),
  "desk-planner": require("../../../assets/banners/desk-planner.jpg"),
  "iced-latte": require("../../../assets/banners/iced-latte.jpg"),
  "maths-tutoring": require("../../../assets/banners/maths-tutoring.jpg"),
};

/** Where in each photo the banner should look, as a share from the top and the left, so the product is what shows. */
export const promoPhotoFocus: Record<string, { left: string; top: string }> = {
  "burger-chips": { left: "30%", top: "46%" },
  "denim-jacket": { left: "50%", top: "42%" },
  "desk-planner": { left: "50%", top: "50%" },
  "iced-latte": { left: "50%", top: "62%" },
  "maths-tutoring": { left: "50%", top: "40%" },
};

/** Photos whose product sits on the left are mirrored, so it ends up on the right of the banner, clear of the fade. */
export const promoPhotoFlip: Record<string, boolean> = { "burger-chips": true };
