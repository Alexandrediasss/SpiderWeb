// Veneno da gosma verde (ato 3): lenta, fraca nos pulos, sem teia, e morre quando o tempo acaba. Lógica pura.
// Não tem cura. Spec: docs/features/goo-poison.md
import { POISON } from '../config';
import type { SpiderMotor } from './SpiderMotor';

export class Poison {
  active = false;
  /** Segundos até morrer (só vale com `active`). */
  left = 0;

  /** Encostou na gosma. Devolve true só na primeira vez (encostar de novo não reinicia o tempo). */
  apply(): boolean {
    if (this.active) return false;
    this.active = true;
    this.left = POISON.sec;
    return true;
  }

  /** Avança o tempo. Devolve true no quadro em que o veneno mata. */
  update(dt: number): boolean {
    if (!this.active || this.left <= 0) return false;
    this.left = Math.max(0, this.left - dt);
    return this.left === 0;
  }

  /** 0 (acabou de pegar) a 1 (vai morrer). */
  get progress(): number {
    return this.active ? 1 - this.left / POISON.sec : 0;
  }

  /** Dá para soltar teia (balanço ou combate)? */
  get canWeb(): boolean {
    return !this.active;
  }

  /** Só morrendo: volta ao normal (checkpoint). */
  clear(): void {
    this.active = false;
    this.left = 0;
  }

  /** Passa os efeitos (lenta, pulo fraco, pouco controle no ar) para o motor da aranha. */
  applyTo(motor: SpiderMotor): void {
    motor.speedScale = this.active ? POISON.speedScale : 1;
    motor.jumpScale = this.active ? POISON.jumpScale : 1;
    motor.airScale = this.active ? POISON.airScale : 1;
  }
}
