export type ClothingItem = {
  id: number;
  name: string;
  created_at: string;
  product_img: string | null;
  tags: string;
  url: string;
  secondary_img: string | null;
  description: string;
  brand?: string;
  category?: string;
  color?: string;
  price?: string | number;
};
