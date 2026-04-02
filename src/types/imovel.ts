export interface Imovel {
  id: number;
  title: { rendered: string };
  price_property?: string;
  bedrooms_property?: string;
  bathrooms_property?: string;
  area_property?: string;
  resolved_images?: string[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
  };
}
