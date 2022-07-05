import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

import {
  fadeInOnEnterAnimation,
  pulseOnEnterAnimation,
  slideInDownOnEnterAnimation,
  slideInLeftOnEnterAnimation,
  slideInRightOnEnterAnimation,
  slideInUpOnEnterAnimation
} from 'angular-animations';

import {
  BehaviorSubject,
  filter,
  fromEvent,
  map,
  Subject,
  takeUntil,
  tap
} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    slideInRightOnEnterAnimation(),
    slideInLeftOnEnterAnimation(),
    slideInUpOnEnterAnimation(),
    slideInDownOnEnterAnimation(),
    fadeInOnEnterAnimation(),
    pulseOnEnterAnimation()
  ]
})
export class AppComponent implements OnInit {

  gamefield$ = new BehaviorSubject<Stone[][]>([]);
  animation = Animation;
  colors: Record<number, string> = {
    2: '#EFFA00',
    4: '#747A00',
    8: '#BDC700',
    16: '#79FA0F',
    32: '#A2FB5A',
    64: '#4F7A2C',
    128: '#61C70C',
    256: '#C77C00',
    512: '#FBB74B',
    1024: '#7A4B00',
    2048: '#FA9A00'
  };

  private rows = 4;
  private cols = 4;
  private gameover$ = new Subject<void>();
  private gamefield: Stone[][] = [];

  ngOnInit(): void {
    this.startGame();
  }

  private startGame(): void {
    this.gamefield = this.createNewGamefield();
    this.gamefield$.next(this.gamefield);

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntil(this.gameover$),
        map(event => this.toKeyCode(event)),
        filter(code => this.isKeyCodeAllowed(code)),
        map(code => this.moveStones(code)),
        filter(gamefield => this.isGamefieldChanged(gamefield)),
        map(gamefield => this.spawnRandomStone(gamefield)),
        tap(gamefield => this.gamefield$.next(gamefield))
      )
      .subscribe(gamefield => this.gamefield = this.resetAnimations(gamefield));
  }

  private toKeyCode(event: KeyboardEvent): KeyCode {
    return event.code as KeyCode;
  }

  private resetAnimations(gamefield: Stone[][]): Stone[][] {
    return gamefield.map(row => row.map(s => ({ ...s, animation: Animation.nothing })));
  }

  private isGamefieldChanged(gamefield: Stone[][]): boolean {
    return gamefield.flat().map(s => s.value).join('') !== this.gamefield.flat().map(s => s.value).join('');
  }

  private moveStones(code: KeyCode): Stone[][] {
    const copiedGamefield = this.gamefield.map(r => r.map(s => ({ ...s })));
    return this.gameOptions[code](copiedGamefield);
  }

  private createNewGamefield(): Stone[][] {
    let gamefield: Stone[][] = [];
    const animation = Animation.nothing;
    for (let row = 0; row < this.rows; row++) {
      gamefield[row] = [];
      for (let col = 0; col < this.cols; col++) {
        gamefield[row][col] = { value: 0, animation };
      }
    }
    gamefield = this.spawnRandomStone(gamefield);
    gamefield = this.spawnRandomStone(gamefield);
    return gamefield;
  }

  private spawnRandomStone(gamefield: Stone[][]): Stone[][] {
    const nofreeFieldExists = gamefield.flat().every(c => c.value !== 0);
    if (nofreeFieldExists) {
      this.gameover$.next();
      return [];
    }
    const randomRow = () => Math.floor(Math.random() * this.rows);
    const randomCol = () => Math.floor(Math.random() * this.cols);
    let row = randomRow();
    let col = randomCol();
    while (gamefield[row][col].value !== 0) {
      row = randomRow();
      col = randomCol();
    }
    gamefield[row][col] = { value: this.getTwoOrFour(), animation: Animation.spawning };
    return gamefield;
  }

  private getTwoOrFour(): number {
    return Math.random() > .8 ? 4 : 2;
  }

  private colToRow(gamefield: Stone[][]): Stone[][] {
    return gamefield[0].map((_, index) => gamefield.map(row => row[index]));
  }

  private fillRow(row: Stone[], animation: Animation): Stone[] {
    const nothingToFill = row.length === this.cols;
    if (nothingToFill) {
      return row;
    }
    const length = row.length;
    row.length = this.cols;
    row.fill({ value: 0, animation }, length, this.cols);
    return row;
  }

  private top = (gamefield: Stone[][]): Stone[][] => {
    return this.colToRow(this.colToRow(gamefield)
      .map(row => row.filter(stone => !!stone.value))
      .map(row => row.map(this.merge))
      .map(row => row.filter(stone => !!stone.value))
      .map(row => this.fillRow(row, Animation.bottom)));
  };

  private right = (gamefield: Stone[][]): Stone[][] => {
    return gamefield.map(row => row.reverse())
      .map(row => row.filter(stone => !!stone.value))
      .map(row => row.map(this.merge))
      .map(row => row.filter(stone => !!stone.value))
      .map(row => this.fillRow(row, Animation.left))
      .map(row => row.reverse());
  };

  private bottom = (gamefield: Stone[][]): Stone[][] => {
    return this.colToRow(this.colToRow(gamefield)
      .map(row => row.reverse())
      .map(row => row.filter(stone => !!stone.value))
      .map(row => row.map(this.merge))
      .map(row => row.filter(stone => !!stone.value))
      .map(row => this.fillRow(row, Animation.top))
      .map(row => row.reverse()));
  };

  private left = (gamefield: Stone[][]): Stone[][] => {
    return gamefield
      .map(row => row.filter(stone => !!stone.value))
      .map(row => row.map(this.merge))
      .map(row => row.filter(stone => !!stone.value))
      .map(row => this.fillRow(row, Animation.right));
  };

  private merge(stone: Stone, index: number, array: Stone[]): Stone {
    if (array[index + 1] && array[index + 1].value === stone.value) {
      stone.value *= 2;
      stone.animation = Animation.merged;
      array[index + 1].value = 0;
    }
    return stone;
  }

  private isKeyCodeAllowed(code: KeyCode): boolean {
    return Object.values(KeyCode).includes(code);
  }

  private gameOptions: Record<KeyCode, Function> = {
    [KeyCode.ArrowUp]: this.top,
    [KeyCode.ArrowRight]: this.right,
    [KeyCode.ArrowDown]: this.bottom,
    [KeyCode.ArrowLeft]: this.left
  };
}

enum KeyCode {
  ArrowLeft = 'ArrowLeft',
  ArrowUp = 'ArrowUp',
  ArrowRight = 'ArrowRight',
  ArrowDown = 'ArrowDown'
}

interface Stone {
  value: number,
  animation: Animation
}

enum Animation {
  top, right, bottom, left, spawning, nothing, merged
}