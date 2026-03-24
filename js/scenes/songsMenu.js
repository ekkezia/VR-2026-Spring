// songsMenu.js
// Dynamically creates a menu for each song in songs.json
import * as cg from '../render/core/cg.js';

export async function createSongsMenu(model) {
  // Load songs.json
  const response = await fetch('/media/sound/json/songs.json');
  const songs = await response.json();

  // Create a menu group to hold all song menus
  const menuGroup = model.add('group');

  // Layout parameters
  const startY = 2.0;
  const gapY = 0.4;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    // Each menu is a square with the song title
    const menu = menuGroup
      .add('square')
      .move(0, startY - i * gapY, -0.5)
      .scale(0.7, 0.25, 0.01)
      .color(0.25, 0.35, 0.5);
    menu
      .add(cg.clay.text(song.title))
      .move(-0.3, -0.05, 0.01)
      .color(0, 0, 0)
      .scale(6);
    // Optionally, add interaction logic here
  }

  return menuGroup;
}
