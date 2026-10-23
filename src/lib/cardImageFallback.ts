/**
 * Resilient multi-tier fallback handler for Pokémon TCG card images:
 * Tier 1: Authentic card scan (thumbnail / high-res)
 * Tier 2: Official PokeAPI high-res Pokémon species illustration (1..1025)
 * Tier 3: Classic pixel sprite (spriteUrl)
 * Tier 4: Hidden broken icon / placeholder
 */
export function handleCardImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  pokemonId?: number,
  spriteUrl?: string
): void {
  const img = e.currentTarget
  const currentSrc = img.src

  const officialArtwork = pokemonId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
    : null

  // If primary card scan failed and we haven't attempted official artwork yet
  if (officialArtwork && currentSrc !== officialArtwork && !img.dataset.fallbackOfficial) {
    img.dataset.fallbackOfficial = 'true'
    img.src = officialArtwork
    img.style.objectFit = 'contain'
    img.classList.add('p-2')
    return
  }

  // If official artwork also failed, try retro pixel sprite
  if (spriteUrl && currentSrc !== spriteUrl && !img.dataset.fallbackSprite) {
    img.dataset.fallbackSprite = 'true'
    img.src = spriteUrl
    img.style.imageRendering = 'pixelated'
    img.style.objectFit = 'contain'
    img.classList.add('p-3')
    return
  }

  // Gracefully hide broken image element to prevent broken icon display
  img.style.display = 'none'
}
