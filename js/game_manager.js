/* eslint-disable no-param-reassign */
import Grid from "./grid.js";
import Tile from "./tile.js";

export class Game {
  constructor(render, storage, startTiles) {
    this.render = render;
    this.storage = storage;
    this.startTiles = startTiles;

    this.setup();
  }

  // Restart the game
  restart() {
    this.storage.clearGameState();
    this.render.continueGame(); // Clear the game won/lost message
    this.setup();
  }

  // Keep playing after winning (allows going over 2048)
  keepPlaying() {
    this.keepPlaying = true;
    this.render.continueGame(); // Clear the game won/lost message
  }

  // Return true if the game is lost, or has won and the user hasn't kept playing
  isGameTerminated() {
    return this.over || (this.won && !this.keepPlaying);
  }

  // Set up the game
  setup() {
    const previousState = this.storage.getGameState();

    // Reload the game from a previous game if present
    if (previousState) {
      this.grid        = new Grid(
        previousState.grid.size,
        previousState.grid.cells
      ); // Reload grid
      this.score       = previousState.score;
      this.over        = previousState.over;
      this.won         = previousState.won;
      this.keepPlaying = previousState.keepPlaying;
    } else {
      this.grid        = new Grid(this.render.size);
      this.score       = 0;
      this.over        = false;
      this.won         = false;
      this.keepPlaying = false;

      // Add the initial tiles
      this.addStartTiles();
    }

    // Update the render
    this.draw();
  }

  // Set up the initial tiles to start the game with
  addStartTiles() {
    for (let i = 0; i < this.startTiles; i += 1) {
      this.addRandomTile();
    }
  }

  // Adds a tile in a random position
  addRandomTile() {
    if (this.grid.cellsAvailable()) {
      const value = Math.random() < 0.9 ? 2 : 4;
      const tile = new Tile(this.grid.randomAvailableCell(), value);

      this.grid.insertTile(tile);
    }
  }

  // Sends the updated grid to the render
  draw() {
    if (this.storage.getBestScore() < this.score) {
      this.storage.setBestScore(this.score);
    }

    // Clear the state when the game is over (game over only, not win)
    if (this.over) {
      this.storage.clearGameState();
    } else {
      this.storage.setGameState(this.serialize());
    }

    this.render.draw(this.grid, {
      score:      this.score,
      over:       this.over,
      won:        this.won,
      bestScore:  this.storage.getBestScore(),
      terminated: this.isGameTerminated()
    });
  }

  // Represent the current game as an object
  serialize() {
    return {
      grid:        this.grid.serialize(),
      score:       this.score,
      over:        this.over,
      won:         this.won,
      keepPlaying: this.keepPlaying
    };
  }

  // Save all tile positions and remove merger info
  prepareTiles() {
    this.grid.eachCell((x, y, tile) => {
      if (tile) {
        // eslint-disable-next-line no-param-reassign
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });
  }

  // Move a tile and its representation
  moveTile(tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  }

  // Move tiles on the grid in the specified direction
  move(direction) {
    // 0: up, 1: right, 2: down, 3: left
    if (this.isGameTerminated()) return; // Don't do anything if the game's over

    const vector     = Game.getVector(direction);
    const traversals = Game.buildTraversals(vector, this.render.size);
    let moved      = false;

    // Save the current tile positions and remove merger information
    this.prepareTiles();

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach((x) => {
      traversals.y.forEach((y) => {
        const cell = { x, y };
        const tile = this.grid.cellContent(cell);

        if (tile) {
          const positions = this.findFarthestPosition(cell, vector);
          const next      = this.grid.cellContent(positions.next);

          // Only one merger per row traversal?
          if (next && next.value === tile.value && !next.mergedFrom) {
            const merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];

            this.grid.insertTile(merged);
            this.grid.removeTile(tile);

            // Converge the two tiles' positions
            tile.updatePosition(positions.next);

            // Update the score
            this.score += merged.value;

            // The mighty 2048 tile
            if (merged.value === 2048) this.won = true;
          } else {
            this.moveTile(tile, positions.farthest);
          }

          if (!Game.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });

    if (moved) {
      this.addRandomTile();

      if (!this.movesAvailable()) {
        this.over = true; // Game over!
      }

      this.draw();
    }
  }

  // Get the vector representing the chosen direction
  static getVector(direction) {
    // Vectors representing tile movement
    const map = {
      0: { x: 0,  y: -1 }, // Up
      1: { x: 1,  y: 0 },  // Right
      2: { x: 0,  y: 1 },  // Down
      3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
  }

  // Build a list of positions to traverse in the right order
  static buildTraversals(vector, size) {
    const traversals = { x: [], y: [] };

    for (let pos = 0; pos < size; pos += 1) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  }

  findFarthestPosition(cell, vector) {
    let previous;

    // Progress towards the vector direction until an obstacle is found
    do {
      previous = cell;
      cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

    return {
      farthest: previous,
      next: cell // Used to check if a merge is required
    };
  }

  movesAvailable() {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  }

  // Check for available matches between tiles (more expensive check)
  tileMatchesAvailable() {
    let tile;

    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        tile = this.grid.cellContent({ x, y });

        if (tile) {
          for (let direction = 0; direction < 4; direction += 1) {
            const vector = Game.getVector(direction);
            const cell   = { x: x + vector.x, y: y + vector.y };

            const other  = this.grid.cellContent(cell);

            if (other && other.value === tile.value) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }

    return false;
  }

  static positionsEqual(first, second) {
    return first.x === second.x && first.y === second.y;
  }
}

export class GameManager {
  constructor(games, input, controlIndex) {
    this.games        = games;
    this.input        = input;
    this.controlIndex = controlIndex;

    this.input.on("move", this.move.bind(this));
    this.input.on("restart", this.restart.bind(this));
    this.input.on("keepPlaying", this.keepPlaying.bind(this));
  }

  move(direction) {
    this.games[this.controlIndex].move(direction);
  }

  restart() {
    this.games.forEach((g) => { g.restart(); });
  }

  keepPlaying() {
    this.games.forEach((g) => { g.keepPlaying(); });
  }

  static createGames(Render, Storage, count, size, startTiles) {
    const games = [];
    for (let i = 0; i < count; i += 1) {
      games.push(new Game(new Render(size), new Storage(`game${i + 1}`), startTiles));
    }
    return games;
  }
}
