import Link from 'next/link';
import Navbar from '@/components/Navbar';
import './games.css';

// Use the game's existing artwork. Every entry links to an actual Next.js game route.
const games = [
  {
    name: 'Formula 1 + 1',
    href: '/games/formula_1',
    image: '/formula1/racetrack.png',
    alt: 'The Formula 1 + 1 racing track',
    subject: 'MATH',
    description: 'Race to the finish by solving math questions.',
    number: '01',
    color: 'red',
  },
  {
    name: 'MapQuest',
    href: '/games/mapQuest',
    image: '/mapQuest_images/Countries/Asia/China.png',
    alt: 'A country outline from the MapQuest geography game',
    subject: 'GEOGRAPHY',
    description: 'Test your geography skills one location at a time.',
    number: '02',
    color: 'blue',
  },
  {
    name: 'WordQuest',
    href: '/games/wordQuest',
    image: '/images/background_home.webp',
    alt: 'WordQuest illustrated game background',
    subject: 'WORDS',
    description: 'Solve crosswords, uncover clues, and earn points.',
    number: '03',
    color: 'purple',
  },
  {
    name: "Moski's Spelling Bee",
    href: '/games/spelling',
    image: '/assets/images/og level.png',
    alt: "Moski's Spelling Adventure level background",
    subject: 'SPELLING',
    description: 'Listen to a word and spell your way through each level.',
    number: '04',
    color: 'green',
  },
];

export default function GamesPage() {
  return (
    <div className="games-page">
      <Navbar />
      <main className="games-page__main">
        <header className="games-page__heading">
          <span className="games-page__kicker">SELECT A GAME</span>
          <h1>Choose Your Quest!</h1>
          <p>Pick a game below, then press <strong>PLAY GAME</strong> to jump right in.</p>
        </header>
        <section className="games-page__grid" aria-label="Available games">
          {games.map((game) => (
            <article className={`games-page__card games-page__card--${game.color}`} key={game.href}>
              <div className="games-page__art">
                <img src={game.image} alt={game.alt} loading="lazy" />
                <span className="games-page__number" aria-hidden="true">{game.number}</span>
              </div>
              <div className="games-page__details">
                <span className="games-page__subject">{game.subject}</span>
                <h2>{game.name}</h2>
                <p>{game.description}</p>
                <Link className="games-page__play" href={game.href}>
                  <span aria-hidden="true">▶</span> PLAY GAME
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
