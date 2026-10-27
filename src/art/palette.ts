// Paleta central. Mude aqui para recolorir o jogo inteiro.

export const PAL = {
  outline: 0x1c1418,

  spider: {
    outline: 0x1c1418,
    abdomen: 0x5e3d2e,
    abdomenLight: 0x86593f,
    pattern: 0xd2ad78,
    head: 0x4a3026,
    headLight: 0x6b4634,
    eye: 0x0d0a0c,
    eyeShine: 0xf4f0f2,
    legNear: 0x3a2721,
    legFar: 0x24181a,
  },

  // Noite de tempestade: o céu já é pintado escuro (lá fora a luz da casa não chega).
  rat: {
    outline: 0x2a1f26,
    fur: 0xf2efe9,
    furShade: 0xc9c3bd,
    furDark: 0x9c958f,
    pink: 0xeaa2ad,
    pinkDark: 0xb86d7a,
    eye: 0xff2a36,
    eyeGlow: 0xff8c8c,
    mouth: 0x5a1f2a,
    tooth: 0xffffff,
  },

  /** Cutscene de abertura: dentro da parede, o líquido mutante e o buraco de rato. */
  intro: {
    plank: [0x231a15, 0x271d17, 0x201713],
    plankGap: 0x110c0a,
    beam: 0x3b2b20,
    beamTop: 0x5a4231,
    beamDark: 0x2a1e17,
    pipe: 0x7a4b2e,
    pipeLight: 0x9c6a43,
    pipeDark: 0x4a2c1b,
    goo: 0x5fe35a,
    gooDark: 0x2f9a3a,
    gooLight: 0xc8ffb0,
    gooGlow: 0x3cff6a,
    holeEdge: 0x15100d,
    holeLight: 0xffd9a0,
    holeLightDeep: 0xb07a40,
  },

  ui: { reticle: 0xffffff, heart: 0xd8323c, heartLight: 0xff8a8a, heartEmpty: 0x3a2a33, heartOutline: 0x140c12 },

  sky: { top: 0x080a14, bottom: 0x1a2036, cloud: 0x2a3046, cloudShade: 0x1d2133 },

  /** Luz (multiplica as cores do cenário). Spec: docs/features/atmosphere.md */
  light: {
    /** Escuro da casa onde nenhuma lâmpada alcança: azulado, mas nunca preto. */
    ambient: 0x575b7c,
    lamp: 0xffd9a0,
    flash: 0xc9d4ff,
    rain: 0x8798bd,
    bolt: 0xf2f0ff,
    dust: 0xffe2b0,
  },

  brick: { base: [0x8a4b3c, 0x96533f, 0x7c4133], light: 0xa8664f, dark: 0x6b372b, mortar: 0x4a332e },
  floor: { board: [0xa86f42, 0xb07746, 0x9d673d], boardLight: 0xc98a55, seam: 0x6e4528, beam: 0x5a4030, beamDark: 0x47321f, plaster: 0xcfc2ad },
  roof: { base: 0x4d4a63, light: 0x625f7c, dark: 0x37354a },

  wood: { base: [0x9a6236, 0x935c32, 0xa1683a], light: 0xbd8250, grain: 0x7f4f2b, dark: 0x5e391f },
  cushion: { base: 0xa13d3d, light: 0xbf5555, dark: 0x7a2b2b },
  mattress: { sheet: 0xece6d8, sheetShade: 0xcfc6b2, blanket: 0x4f6fa8, blanketLight: 0x6487c2, blanketDark: 0x3d5687 },
  cabinet: { base: 0x3e7c78, light: 0x55978f, dark: 0x2c5b58, knob: 0xd8b25a, top: 0xdcd6cb, topLight: 0xf2eee6 },
  fridge: { base: 0xe3e8ec, light: 0xf6f8fa, shade: 0xc4ccd3, dark: 0x8f9aa3 },
  books: [0x9c3b3b, 0x3b5f9c, 0x3b8c5a, 0xc9a23f, 0x7b4b8c, 0xd0cfc8, 0x8c5a3b, 0x2f6f73],
  ceramic: { base: 0xeef0ee, light: 0xffffff, shade: 0xcfd8dc, grout: 0xdde3e5 },

  wall: {
    attic: [0x4a3428, 0x52392c, 0x45302a],
    atticGap: 0x2e2019,
    bedroom: 0x8a6f8f,
    bedroomLight: 0x9c82a1,
    bathroom: 0x9fc7c9,
    bathroomGrout: 0x86aeb0,
    living: 0x5f7d5b,
    livingLight: 0x6a8865,
    kitchen: 0xcdbf98,
    kitchenAlt: 0xd6c9a4,
    kitchenGrout: 0xb5a57d,
    cavity: 0x2f221c,
    baseboard: 0xe0d6c4,
    baseboardDark: 0xa99b85,
  },

  decor: {
    frame: 0x6b4a2e,
    frameLight: 0x8c6640,
    glassTop: 0x0b0e1c,
    glassBottom: 0x222a45,
    glassShine: 0x8a97c4,
    sill: 0xe8dcc8,
    curtain: 0xc0574a,
    curtainDark: 0x963f36,
    gold: 0xc9a14a,
    goldDark: 0x8f6b2a,
    lampShade: 0xe6c06a,
    lampShadeDark: 0xb08a3e,
    lampLight: 0xfff1c4,
    cord: 0x2a2224,
    clockFace: 0xf4efe2,
    plantPot: 0xb4603c,
    plantPotDark: 0x8a4529,
    leaf: 0x4f9a4a,
    leafDark: 0x356f36,
    leafLight: 0x77c06a,
    silver: 0xb9c1c8,
    silverDark: 0x7d868e,
    mirror: 0xc8dde6,
    web: 0xe6e6ea,
  },
};
