import { supabase } from '@/integrations/supabase/client';

export interface WPProperty {
  id: number;
  title: { rendered: string };
  content?: { rendered: string };
  status: string;
  price_property: string;
  bedrooms_property: number;
  bathrooms_property: number;
  total_area_property: string;
  differentials_porperty: number[];
  resolved_images: string[];
  images_property?: number[];
  code_property?: string;
  address_property?: string;
  built_area_property?: string;
  district_property?: string;
  city_property?: string;
  state_property?: string;
  garages_property?: string;
  rooms_property?: string;
  suites_property?: string;
  type_measurements?: string;
  business_property?: string;
  type_property?: string;
  class_list?: string[];
  link?: string;
}

export async function fetchProperties(params?: { page?: number; per_page?: number }): Promise<WPProperty[]> {
  const query = new URLSearchParams();
  query.set('_embed', '1');
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));

  const endpoint = `/properties?${query.toString()}`;
  
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    headers: { 'x-wp-endpoint': endpoint, 'x-wp-method': 'GET' }
  });

  if (error || data?.error) {
    const msg = data?.error?.message || data?.error || error?.message;
    if (msg === 'Unauthenticated') {
      await supabase.auth.signOut();
      window.location.href = '/login';
      throw new Error('Sessão de segurança expirada. Faça login novamente.');
    }
    throw error || new Error(msg || 'Failed to fetch properties');
  }
  return data.data;
}

export async function fetchProperty(id: number) {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    headers: { 'x-wp-endpoint': `/properties/${id}?_embed`, 'x-wp-method': 'GET' }
  });
  if (error || data?.error) {
    const msg = data?.error?.message || data?.error || error?.message;
    if (msg === 'Unauthenticated') {
      await supabase.auth.signOut();
      window.location.href = '/login';
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    throw error || new Error(msg || 'Failed to fetch property');
  }
  return data.data;
}

export async function updateProperty(id: number, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    body: payload,
    headers: { 'x-wp-endpoint': `/properties/${id}`, 'x-wp-method': 'PUT' }
  });
  if (error || data?.error) throw error || new Error(data?.error?.message || 'Failed to update property');
  return data.data;
}

export async function createProperty(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    body: payload,
    headers: { 'x-wp-endpoint': `/properties`, 'x-wp-method': 'POST' }
  });
  if (error || data?.error) throw error || new Error(data?.error?.message || 'Failed to create property');
  return data.data;
}

export async function deleteProperty(id: number) {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    headers: { 'x-wp-endpoint': `/properties/${id}?force=true`, 'x-wp-method': 'DELETE' }
  });
  if (error || data?.error) throw error || new Error(data?.error?.message || 'Failed to delete property');
  return data.data;
}

export async function uploadMedia(file: File, postId?: number): Promise<{ id: number; source_url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (postId) {
    formData.append('post', String(postId));
  }
  
  // Notice we must not send JSON body, so we pass FormData natively
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    body: formData,
    headers: { 'x-wp-endpoint': `/media`, 'x-wp-method': 'POST' }
  });
  
  if (error || data?.error) throw error || new Error(data?.error?.message || 'Failed to upload image');
  return data.data;
}

export async function getDifferentials(): Promise<{ id: number; name: string }[]> {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    headers: { 'x-wp-endpoint': `/tax_differential`, 'x-wp-method': 'GET' }
  });
  if (error || data?.error) {
    const msg = data?.error?.message || data?.error || error?.message;
    if (msg === 'Unauthenticated') {
      await supabase.auth.signOut();
      window.location.href = '/login';
      throw new Error('Sessão de segurança expirada. Faça login novamente.');
    }
    throw error || new Error(msg || 'Failed to fetch differentials');
  }
  return data.data;
}

export async function getTaxonomyTerms(taxonomy: string): Promise<{ id: number; name: string }[]> {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    headers: { 'x-wp-endpoint': `/${taxonomy}?per_page=100`, 'x-wp-method': 'GET' }
  });
  if (error || data?.error) throw error || new Error(data?.error?.message || `Failed to fetch ${taxonomy} terms`);
  return data.data;
}

export async function createTaxonomyTerm(taxonomy: string, name: string): Promise<{ id: number; name: string }> {
  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    body: { name },
    headers: { 'x-wp-endpoint': `/${taxonomy}`, 'x-wp-method': 'POST' }
  });
  if (error || data?.error) throw error || new Error(data?.error?.message || `Failed to create ${taxonomy} term`);
  return data.data;
}