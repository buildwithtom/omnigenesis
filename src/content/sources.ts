export interface Source {
  title: string
  url: string
  published?: string
  verified: string
}

// Verification dates describe this editorial review. A mission page's revision
// date and a news release's publication date have different meanings.
const verified = '2026-11-26'

export const sources: Record<string, Source> = {
  history: {
    title: 'NASA · The Universe’s History',
    url: 'https://science.nasa.gov/universe/overview/',
    verified,
  },
  expansion: {
    title: 'NASA Webb · The Big Bang, with John Mather',
    url: 'https://science.nasa.gov/mission/webb/big-bang-q-and-a/',
    verified,
  },
  particles: {
    title: 'CERN · The Early Universe',
    url: 'https://home.cern/science/physics/early-universe/',
    verified,
  },
  nuclei: {
    title: 'Particle Data Group · Big Bang Nucleosynthesis',
    url: 'https://pdg.lbl.gov/2024/reviews/rpp2024-rev-bbang-nucleosynthesis.pdf',
    published: '2024',
    verified,
  },
  background: {
    title: 'ESA Planck · Why the Microwave?',
    url: 'https://www.esa.int/Science_Exploration/Space_Science/Planck/Why_the_microwave',
    verified,
  },
  dawn: {
    title: 'NASA Webb · Early Universe',
    url: 'https://science.nasa.gov/mission/webb/early-universe/',
    verified,
  },
  galaxies: {
    title: 'NASA Webb · Galaxies Over Time',
    url: 'https://science.nasa.gov/mission/webb/galaxies-over-time/',
    verified,
  },
  webb: {
    title: 'NASA Webb · Spectroscopic confirmation of MoM-z14',
    url: 'https://science.nasa.gov/missions/webb/nasa-webb-pushes-boundaries-of-observable-universe-closer-to-big-bang/',
    published: '2026-01-28',
    verified,
  },
  web: {
    title: 'NASA Hubble · Mapping the Cosmic Web',
    url: 'https://science.nasa.gov/mission/hubble/science/science-highlights/mapping-the-cosmic-web/',
    verified,
  },
  structure: {
    title: 'NASA · Large Scale Structures',
    url: 'https://science.nasa.gov/universe/galaxies/large-scale-structures/',
    verified,
  },
  elements: {
    title: 'NASA Hubble · Stellar Explosions',
    url: 'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-stellar-explosions/',
    verified,
  },
  milkyway: {
    title: 'NASA / Spitzer · The Milky Way Galaxy',
    url: 'https://science.nasa.gov/resource/the-milky-way-galaxy/',
    published: '2017-11-08',
    verified,
  },
  disk: {
    title: 'NASA · Solar System Formation',
    url: 'https://science.nasa.gov/solar-system/solar-system-facts/',
    verified,
  },
  earth: {
    title: 'USGS · Age of the Earth',
    url: 'https://pubs.usgs.gov/gip/geotime/age.html',
    verified,
  },
  impacts: {
    title: 'NASA · What Was the Earth Like Right After It Formed?',
    url: 'https://science.nasa.gov/astrobiology/learning-resources/alp/earth-right-after-it-formed/',
    verified,
  },
  core: {
    title: 'American Museum of Natural History · How Earth Formed',
    url: 'https://www.amnh.org/learn-teach/resources-for-learning/hall-of-planet-earth/guided-exploration-how-earth-formed',
    verified,
  },
}
