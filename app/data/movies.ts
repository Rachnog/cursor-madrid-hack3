// Movie catalog for the card-draw deck.
// 10 "negative" heist/crime films + 10 "positive" feel-good films.
// Images live in /public/cards (served at /cards/*). Mirrors /public/movies.json.

export type Sentiment = "positive" | "negative";

export interface Movie {
  id: number;
  title: string;
  image: string;
  sentiment: Sentiment;
  description: string;
}

export const CARD_BACK = "/cards/card-back.jpg";

export const MOVIES: Movie[] = [
  { id: 1, title: "La Casa de Papel", image: "/cards/movie-1.jpg", sentiment: "negative", description: "A criminal mastermind leads an audacious heist on the Royal Mint of Spain." },
  { id: 2, title: "Wall Street", image: "/cards/movie-2.jpg", sentiment: "negative", description: "Greed, ambition and insider trading in the cutthroat world of 1980s high finance." },
  { id: 3, title: "L.A. Confidential", image: "/cards/movie-3.jpg", sentiment: "negative", description: "Corruption and murder simmer beneath the glamour of 1950s Los Angeles." },
  { id: 4, title: "City of God", image: "/cards/movie-4.jpg", sentiment: "negative", description: "Two boys take divergent paths amid escalating gang violence in Rio's favelas." },
  { id: 5, title: "Catch Me If You Can", image: "/cards/movie-5.jpg", sentiment: "negative", description: "A charming young con artist forges his way across the globe, chased by the FBI." },
  { id: 6, title: "Ocean's Eleven", image: "/cards/movie-6.jpg", sentiment: "negative", description: "Eleven con men plot to rob three Las Vegas casinos in a single night." },
  { id: 7, title: "The Italian Job", image: "/cards/movie-7.jpg", sentiment: "negative", description: "A daring gold heist and a Mini Cooper getaway through the streets of Italy." },
  { id: 8, title: "The Untouchables", image: "/cards/movie-8.jpg", sentiment: "negative", description: "Lawmen wage war on Al Capone's bootlegging empire in Prohibition-era Chicago." },
  { id: 9, title: "The Irishman", image: "/cards/movie-9.jpg", sentiment: "negative", description: "An aging hitman reflects on decades of mob loyalty, violence and betrayal." },
  { id: 10, title: "Lupin", image: "/cards/movie-10.jpg", sentiment: "negative", description: "A gentleman thief plots elaborate, elegant heists to avenge his father." },
  { id: 11, title: "Amélie", image: "/cards/amelie.jpg", sentiment: "positive", description: "A whimsical Parisian waitress quietly orchestrates small moments of joy for others." },
  { id: 12, title: "Barbie", image: "/cards/barbie.jpg", sentiment: "positive", description: "A doll's journey into the real world becomes a colorful celebration of identity." },
  { id: 13, title: "Forrest Gump", image: "/cards/forrest-gump.jpg", sentiment: "positive", description: "An earnest man stumbles through history with kindness, luck and a pure heart." },
  { id: 14, title: "Frozen", image: "/cards/frozen.jpg", sentiment: "positive", description: "A fearless princess braves an eternal winter, powered by sisterly love." },
  { id: 15, title: "La La Land", image: "/cards/la-la-land.jpg", sentiment: "positive", description: "Two dreamers chase love and ambition through a song-filled Los Angeles." },
  { id: 16, title: "Mary Poppins", image: "/cards/mary-poppins.jpg", sentiment: "positive", description: "A magical nanny brings wonder, song and warmth to a London family." },
  { id: 17, title: "Paddington", image: "/cards/paddington.jpg", sentiment: "positive", description: "A polite little bear spreads kindness across London, one marmalade sandwich at a time." },
  { id: 18, title: "The Sound of Music", image: "/cards/sound-of-music.jpg", sentiment: "positive", description: "A spirited governess fills a family's home with music and hope." },
  { id: 19, title: "Teletubbies", image: "/cards/teletubbies.jpg", sentiment: "positive", description: "Four cheerful creatures play and giggle under a sunny, friendly sky." },
  { id: 20, title: "Willy Wonka", image: "/cards/willy-wonka.jpg", sentiment: "positive", description: "A golden ticket opens the doors to a magical world of pure imagination." },
];
