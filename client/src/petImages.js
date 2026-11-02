export const petImages = {
  Dog: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85',
  Cat: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85',
  Bird: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=85',
  Fish: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=900&q=85',
  Other: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?auto=format&fit=crop&w=900&q=85'
};

export function getPetImage(pet) {
  const image = Array.isArray(pet?.images) ? pet.images.find((item) => item?.trim()) : '';
  const lower = image?.trim().toLowerCase() || '';

  if (lower.startsWith('http://') || lower.startsWith('https://')) return image;
  if (lower.startsWith('data:image/')) return image;

  return petImages[pet?.category] || petImages.Other;
}
