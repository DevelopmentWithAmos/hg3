import { InputState } from '../types/game';

const BUFFER_WINDOW_MS = 150;

/**
 * Mutable singleton input buffer read at 60fps inside the 2D game loop without React re-renders.
 */
class InputManager {
  private heldKeys = new Set<string>();
  public state: InputState = {
    moveX: 0,
    moveZ: 0,
    magnitude: 0,
    sprint: false,
    block: false,
    crouch: false,
    jumpBufferUntil: 0,
    punchBufferUntil: 0,
    kickBufferUntil: 0,
    dodgeBufferUntil: 0,
    specialBufferUntil: 0,
    joystickActive: false,
    joystickX: 0,
    joystickY: 0,
    cameraYawOffset: 0,
  };

  private touchSprint = false;
  private touchBlock = false;
  private joystickJumpArmed = true;
  private initialized = false;
  private gameplayActive = false;

  public setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    if (!active) {
      this.clearAll();
    }
  }

  public init(): () => void {
    if (this.initialized || typeof window === 'undefined') {
      return () => {};
    }
    this.initialized = true;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'Space'
      ) {
        if (this.gameplayActive || document.activeElement === document.body) {
          e.preventDefault();
        }
      }

      const wasHeld = this.heldKeys.has(e.code);
      this.heldKeys.add(e.code);

      if (this.gameplayActive && !e.repeat && !wasHeld) {
        if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
          this.triggerJump();
        } else if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'KeyF') {
          this.triggerPunch();
        } else if (e.code === 'KeyK' || e.code === 'KeyX') {
          this.triggerKick();
        } else if (e.code === 'KeyE' || e.code === 'KeyV' || e.code === 'KeyU') {
          this.triggerDodge();
        } else if (e.code === 'KeyR' || e.code === 'KeyH' || e.code === 'KeyB') {
          this.triggerSpecial();
        }
      }

      this.recompute();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.heldKeys.delete(e.code);
      this.recompute();
    };

    const onBlur = () => {
      this.clearAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      this.initialized = false;
    };
  }

  public triggerJump(): void {
    this.state.jumpBufferUntil = performance.now() + BUFFER_WINDOW_MS;
  }

  public triggerPunch(): void {
    this.state.punchBufferUntil = performance.now() + BUFFER_WINDOW_MS;
  }

  public triggerKick(): void {
    this.state.kickBufferUntil = performance.now() + BUFFER_WINDOW_MS;
  }

  public triggerDodge(): void {
    this.state.dodgeBufferUntil = performance.now() + BUFFER_WINDOW_MS;
  }

  public triggerSpecial(): void {
    this.state.specialBufferUntil = performance.now() + BUFFER_WINDOW_MS;
  }

  public consumeJump(): boolean {
    const now = performance.now();
    if (now <= this.state.jumpBufferUntil) {
      this.state.jumpBufferUntil = 0;
      return true;
    }
    return false;
  }

  public consumePunch(): boolean {
    const now = performance.now();
    if (now <= this.state.punchBufferUntil) {
      this.state.punchBufferUntil = 0;
      return true;
    }
    return false;
  }

  public consumeKick(): boolean {
    const now = performance.now();
    if (now <= this.state.kickBufferUntil) {
      this.state.kickBufferUntil = 0;
      return true;
    }
    return false;
  }

  public consumeDodge(): boolean {
    const now = performance.now();
    if (now <= this.state.dodgeBufferUntil) {
      this.state.dodgeBufferUntil = 0;
      return true;
    }
    return false;
  }

  public consumeSpecial(): boolean {
    const now = performance.now();
    if (now <= this.state.specialBufferUntil) {
      this.state.specialBufferUntil = 0;
      return true;
    }
    return false;
  }

  public setJoystick(active: boolean, x: number, y: number): void {
    this.state.joystickActive = active;
    this.state.joystickX = x;
    this.state.joystickY = y;

    if (!active || y > -0.35) {
      this.joystickJumpArmed = true;
    } else if (active && this.joystickJumpArmed && y < -0.68 && this.gameplayActive) {
      this.joystickJumpArmed = false;
      this.triggerJump();
    }

    this.recompute();
  }

  public setTouchSprint(active: boolean): void {
    this.touchSprint = active;
    this.recompute();
  }

  public setTouchBlock(active: boolean): void {
    this.touchBlock = active;
    this.recompute();
  }

  public addCameraYaw(deltaRad: number): void {
    this.state.cameraYawOffset += deltaRad;
  }

  public resetCameraYaw(): void {
    this.state.cameraYawOffset = 0;
  }

  public clearAll(): void {
    this.heldKeys.clear();
    this.touchSprint = false;
    this.touchBlock = false;
    this.joystickJumpArmed = true;
    this.state.joystickActive = false;
    this.state.joystickX = 0;
    this.state.joystickY = 0;
    this.state.crouch = false;
    this.state.jumpBufferUntil = 0;
    this.state.punchBufferUntil = 0;
    this.state.kickBufferUntil = 0;
    this.state.dodgeBufferUntil = 0;
    this.state.specialBufferUntil = 0;
    this.recompute();
  }

  public recompute(): void {
    let kbX = 0;
    let kbZ = 0;

    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) kbX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) kbX += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) kbZ -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) kbZ += 1;

    let rawX = kbX;
    const rawZ = kbZ;
    let mag = Math.abs(kbX) > 0 ? 1 : 0;

    if (this.state.joystickActive) {
      const jLen = Math.hypot(this.state.joystickX, this.state.joystickY);
      if (jLen > 0.08) {
        const horiz = Math.abs(this.state.joystickX);
        rawX = horiz > 0.14 ? Math.sign(this.state.joystickX) * Math.min(1, horiz * 1.15) : 0;
        mag = Math.min(1, jLen);
      }
    }

    this.state.moveX = rawX;
    this.state.moveZ = rawZ;
    this.state.magnitude = Math.abs(rawX) > 0.08 ? Math.min(1, Math.abs(rawX)) : 0;
    this.state.sprint =
      this.heldKeys.has('ShiftLeft') ||
      this.heldKeys.has('ShiftRight') ||
      this.touchSprint ||
      (this.state.joystickActive && Math.abs(this.state.joystickX) > 0.78);
    this.state.crouch =
      this.heldKeys.has('KeyS') ||
      this.heldKeys.has('ArrowDown') ||
      (this.state.joystickActive && this.state.joystickY > 0.58);
    this.state.block =
      this.heldKeys.has('KeyL') ||
      this.heldKeys.has('KeyC') ||
      this.heldKeys.has('KeyQ') ||
      this.touchBlock;
  }
}

export const inputManager = new InputManager();
