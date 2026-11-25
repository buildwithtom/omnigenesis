export interface Chapter {
  id: string
  title: string
  time: string
  age: number
  weight: number
  narrative: string
  description: string
  uncertainty: string
  evidenceType: string
  sources: string[]
}

// Ages are approximate pacing anchors in years since the hot Big Bang.
// The two opening zeros denote the limit of the clock. The dark ages,
// cosmic dawn, galaxies and web overlap; their anchors are editorial samples.
const second = 1 / (365.25 * 24 * 60 * 60)

export const chapters: Chapter[] = [
  {
    id: 'unknown', title: 'The Unknown', time: 'Time undefined',
    age: 0, weight: 1,
    narrative: 'At the edge of everything we know, our story begins.',
    description: 'Our best measurements trace the universe back to a hot, dense past. How far the idea of time itself reaches back is still an open question.',
    uncertainty: 'The point marks the limit of our knowledge. Expansion happened throughout space, with no central point of origin.',
    evidenceType: 'Open question', sources: ['expansion', 'history'],
  },
  {
    id: 'inflation', title: 'The Unfolding', time: '≈13.8 billion years ago',
    age: 0, weight: 1.15,
    narrative: 'Space itself expands.',
    description: 'Inflation proposes that distances grew enormously in a fleeting interval. It could explain why far-apart regions of the universe have nearly the same temperature.',
    uncertainty: 'Inflation is a leading hypothesis. Its cause, duration and transition into the hot early universe remain uncertain.',
    evidenceType: 'Leading hypothesis', sources: ['history', 'expansion'],
  },
  {
    id: 'energy', title: 'A Universe of Energy', time: 'The first seconds',
    age: 0.000001 * second, weight: 1,
    narrative: 'In the heat, matter takes form.',
    description: 'In the young universe, quarks moved through a hot, dense mixture of particles and radiation. As space expanded and cooled, quarks bound together into protons and neutrons.',
    uncertainty: 'Particle experiments test the physics of this era. The glowing field is an artistic interpretation of those conditions.',
    evidenceType: 'Particle physics model', sources: ['particles', 'history'],
  },
  {
    id: 'nucleosynthesis', title: 'The First Nuclei', time: 'The first few minutes',
    age: 3 * 60 * second, weight: 0.9,
    narrative: 'The first building blocks of matter take shape.',
    description: 'Protons and neutrons joined to make helium nuclei and traces of other light nuclei. Most protons remained alone as hydrogen nuclei. Electrons still moved freely.',
    uncertainty: 'Astronomers compare predicted quantities with measurements of ancient gas. Neutral atoms would form hundreds of thousands of years later.',
    evidenceType: 'Abundance measurements', sources: ['nuclei', 'history'],
  },
  {
    id: 'recombination', title: 'The Universe Becomes Transparent', time: '≈380,000 years after the Big Bang',
    age: 380000, weight: 1.15,
    narrative: 'Light is finally free to travel.',
    description: 'Electrons settled into atoms. Photons that had scattered again and again could now cross space freely. We receive that ancient light today as the cosmic microwave background.',
    uncertainty: 'This is the oldest light we can observe directly. The colours here illustrate tiny temperature differences using a generated pattern.',
    evidenceType: 'Measured radiation', sources: ['background', 'expansion'],
  },
  {
    id: 'dark-ages', title: 'The Cosmic Dark Ages', time: 'After the first 380,000 years',
    age: 400000, weight: 0.85,
    narrative: 'For millions of years, the universe had no stars.',
    description: 'Neutral hydrogen and helium filled the space between denser patches of gas. Gravity slowly gathered more matter into those patches. Starlight had yet to appear.',
    uncertainty: 'The end of the dark ages depended on where gas first collapsed. The background radiation was already present throughout space.',
    evidenceType: 'Structure formation model', sources: ['history', 'dawn', 'web'],
  },
  {
    id: 'cosmic-dawn', title: 'Cosmic Dawn', time: 'The first few hundred million years',
    age: 100e6, weight: 1.25,
    narrative: 'The darkness gives way to stars.',
    description: 'Gravity squeezed gas until its heart grew hot enough for hydrogen to fuse into helium. For the first time, stars lit their surroundings from within.',
    uncertainty: 'The birth date of the very first star remains unknown. This ignition represents one possible moment in a long, uneven dawn.',
    evidenceType: 'Stellar formation model', sources: ['dawn', 'history'],
  },
  {
    id: 'galaxies', title: 'The Birth of Galaxies', time: 'Within a few hundred million years',
    age: 250e6, weight: 1.15,
    narrative: 'Islands of stars gather in the dark.',
    description: 'Gas and stars collected in young galaxies, many with bright, irregular knots. Infalling gas fed their growth, and encounters brought some galaxies together.',
    uncertainty: 'On January 28, 2026, NASA reported that Webb spectroscopy confirmed MoM-z14 as it appeared about 280 million years after the Big Bang. How galaxies grew so quickly remains under study.',
    evidenceType: 'Spectroscopic evidence', sources: ['webb', 'galaxies'],
  },
  {
    id: 'cosmic-web', title: 'The Architecture of the Universe', time: 'Across billions of years',
    age: 1e9, weight: 1.2,
    narrative: 'The ingredients of future worlds are forged in stars.',
    description: 'Gravity drew matter into filaments, with clusters at their crossings and voids between them. Inside galaxies, stars made elements such as oxygen. Supernovae scattered them, and merging neutron stars made some of the heaviest elements.',
    uncertainty: 'Astronomers trace dark matter through its gravity. The visible filaments here represent the distribution of matter on scales far larger than a galaxy.',
    evidenceType: 'Surveys and gravitational lensing', sources: ['web', 'structure', 'elements'],
  },
  {
    id: 'solar-system', title: 'The Birth of Our Solar System', time: '≈4.6 billion years ago',
    age: 9.2e9, weight: 1.15,
    narrative: 'From the remnants of ancient stars, a new system emerges.',
    description: 'A cloud of gas and dust collapsed. The young Sun grew at its centre while solid grains in the surrounding disk came together, building larger bodies and eventually planets.',
    uncertainty: 'The scene compresses sizes, distances and orbital periods so the structure of the disk can be seen.',
    evidenceType: 'Planet formation model', sources: ['disk', 'earth'],
  },
  {
    id: 'earth', title: 'Earth', time: '≈4.54 billion years ago',
    age: 9.26e9, weight: 1.3,
    narrative: 'Among countless worlds, one would eventually become our home.',
    description: 'Rocky bodies collided and a planet grew. Impacts heated the young Earth. Dense metal sank toward its centre while lighter rock formed the mantle above.',
    uncertainty: 'Lead isotopes in meteorites and terrestrial material constrain Earth’s age. The molten surface is an artist’s reconstruction of a planet that formed over time.',
    evidenceType: 'Isotopic dating', sources: ['earth', 'impacts', 'core'],
  },
]
