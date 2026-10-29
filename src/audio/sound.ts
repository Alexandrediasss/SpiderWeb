// Todo o som do jogo, criado uma vez só e reaproveitado quando a cena reinicia
// (morrer, Restart, Main Menu): a chuva não corta e o mudo continua valendo.
import { AudioHub } from './AudioHub';
import { Footsteps } from './Footsteps';
import { MusicPlayer } from './MusicPlayer';
import { Sfx } from './Sfx';
import { StormSounds } from './StormSounds';
import { ZombieVoices } from './ZombieVoices';

export interface Sound {
  hub: AudioHub;
  music: MusicPlayer;
  storm: StormSounds;
  footsteps: Footsteps;
  sfx: Sfx;
  zombies: ZombieVoices;
}

let sound: Sound | null = null;

export function getSound(): Sound {
  if (sound) return sound;
  const hub = new AudioHub();
  hub.unlockOnGesture();
  sound = {
    hub,
    music: new MusicPlayer(hub.ctx, hub.input),
    storm: new StormSounds(hub.ctx, hub.input),
    footsteps: new Footsteps(hub.ctx, hub.input),
    sfx: new Sfx(hub.ctx, hub.input),
    zombies: new ZombieVoices(hub.ctx, hub.input),
  };
  sound.storm.startRain();
  return sound;
}
