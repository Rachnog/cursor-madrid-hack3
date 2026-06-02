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
  /** Gestos sugeridos para actuar la película (mímica). Se muestran como pistas
   *  al jugador y se usan también como "diccionario de gestos" para la IA. */
  hints: string[];
}

export const CARD_BACK = "/cards/card-back.jpg";

export const MOVIES: Movie[] = [
  { id: 1, title: "La Casa de Papel", image: "/cards/movie-1.jpg", sentiment: "negative", description: "A criminal mastermind leads an audacious heist on the Royal Mint of Spain.", hints: ["Tápate la cara con las manos como una máscara", "Anda de puntillas mirando a izquierda y derecha", "Levanta las manos como un atracador rindiéndose", "Frota los dedos para indicar dinero"] },
  { id: 2, title: "Wall Street", image: "/cards/movie-2.jpg", sentiment: "negative", description: "Greed, ambition and insider trading in the cutthroat world of 1980s high finance.", hints: ["Sujeta un teléfono a la oreja y grita", "Pulgar arriba y luego pulgar abajo", "Ajústate una corbata invisible y ponte chulo", "Frota los dedos para indicar dinero"] },
  { id: 3, title: "L.A. Confidential", image: "/cards/movie-3.jpg", sentiment: "negative", description: "Corruption and murder simmer beneath the glamour of 1950s Los Angeles.", hints: ["Bájate un sombrero invisible sobre los ojos", "Haz una pistola con los dedos y apunta", "Muestra una placa de policía con la mano plana", "Pásate un dedo por el cuello"] },
  { id: 4, title: "City of God", image: "/cards/movie-4.jpg", sentiment: "negative", description: "Two boys take divergent paths amid escalating gang violence in Rio's favelas.", hints: ["Sujeta una cámara y pulsa el botón", "Señala a un lado y luego al otro", "Chuta un balón de fútbol invisible", "Señala al cielo con ambas manos (dios)"] },
  { id: 5, title: "Catch Me If You Can", image: "/cards/movie-5.jpg", sentiment: "negative", description: "A charming young con artist forges his way across the globe, chased by the FBI.", hints: ["Estira los brazos como alas de avión", "Corre en el sitio mirando atrás por encima del hombro", "Haz 'ven aquí' con un dedo", "Finge firmar una firma en el aire"] },
  { id: 6, title: "Ocean's Eleven", image: "/cards/movie-6.jpg", sentiment: "negative", description: "Eleven con men plot to rob three Las Vegas casinos in a single night.", hints: ["Muestra diez dedos y luego uno más", "Agita y lanza dados invisibles", "Reparte cartas una a una", "Pega la oreja a una caja fuerte y gira el dial"] },
  { id: 7, title: "The Italian Job", image: "/cards/movie-7.jpg", sentiment: "negative", description: "A daring gold heist and a Mini Cooper getaway through the streets of Italy.", hints: ["Agarra un volante y da bandazos", "Junta los dedos y agita la mano (gesto italiano)", "Levanta algo pesado y brillante (lingotes de oro)", "Señala tu muñeca como mirando la hora y corre"] },
  { id: 8, title: "The Untouchables", image: "/cards/movie-8.jpg", sentiment: "negative", description: "Lawmen wage war on Al Capone's bootlegging empire in Prohibition-era Chicago.", hints: ["Da golpecitos en tu pecho como una placa", "Cruza los brazos y niega con la cabeza", "Sujeta un arma grande invisible y agítala", "Mueve el dedo: 'no puedes tocarme'"] },
  { id: 9, title: "The Irishman", image: "/cards/movie-9.jpg", sentiment: "negative", description: "An aging hitman reflects on decades of mob loyalty, violence and betrayal.", hints: ["Camina despacio y encorvado como un anciano", "Haz una pistola con los dedos y apunta hacia abajo", "Dedo en los labios pidiendo 'silencio'", "Da la mano y luego gírate (traición)"] },
  { id: 10, title: "Lupin", image: "/cards/movie-10.jpg", sentiment: "negative", description: "A gentleman thief plots elaborate, elegant heists to avenge his father.", hints: ["Haz una reverencia elegante con la mano en el estómago", "De puntillas, coge algo rápido y escóndelo", "Tápate y destápate la cara (disfraz)", "Quítate un sombrero invisible a modo de saludo"] },
  { id: 11, title: "Amélie", image: "/cards/amelie.jpg", sentiment: "positive", description: "A whimsical Parisian waitress quietly orchestrates small moments of joy for others.", hints: ["Sonríe con timidez e inclina la cabeza", "Golpea con una cucharilla para romper la capa de un postre", "Lleva una bandeja y sirve a alguien", "Pon la mano en el corazón y sonríe"] },
  { id: 12, title: "Barbie", image: "/cards/barbie.jpg", sentiment: "positive", description: "A doll's journey into the real world becomes a colorful celebration of identity.", hints: ["Quédate rígido como una muñeca con sonrisa congelada", "Anda de puntillas (tacones permanentes)", "Haz un corazón grande con los brazos", "Saluda como una reina de la belleza"] },
  { id: 13, title: "Forrest Gump", image: "/cards/forrest-gump.jpg", sentiment: "positive", description: "An earnest man stumbles through history with kindness, luck and a pure heart.", hints: ["Siéntate y ofrece una caja de bombones", "Corre en el sitio con una gran sonrisa inocente", "Saluda despacio y tócate la gorra", "Mueve rápido una pala de ping-pong"] },
  { id: 14, title: "Frozen", image: "/cards/frozen.jpg", sentiment: "positive", description: "A fearless princess braves an eternal winter, powered by sisterly love.", hints: ["Lanza 'hielo' con las manos y congélate", "Abrázate y tirita de frío", "Apila tres bolas de nieve invisibles para un muñeco", "Abre los brazos de par en par y canta"] },
  { id: 15, title: "La La Land", image: "/cards/la-la-land.jpg", sentiment: "positive", description: "Two dreamers chase love and ambition through a song-filled Los Angeles.", hints: ["Marca el ritmo con los pies y gira", "Toca un piano invisible", "Mira al cielo soñador y señala las estrellas", "Abre los brazos y finge cantar"] },
  { id: 16, title: "Mary Poppins", image: "/cards/mary-poppins.jpg", sentiment: "positive", description: "A magical nanny brings wonder, song and warmth to a London family.", hints: ["Sujeta un paraguas sobre la cabeza y baja flotando", "Saca un montón de cosas de un bolso pequeño", "Chasquea los dedos para ordenar por arte de magia", "Ponte recto y elegante con una reverencia"] },
  { id: 17, title: "Paddington", image: "/cards/paddington.jpg", sentiment: "positive", description: "A polite little bear spreads kindness across London, one marmalade sandwich at a time.", hints: ["Camina contoneándote como un osito", "Unta mermelada en pan y guárdalo bajo el sombrero", "Tócate un sombrerito y lanza una mirada fija", "Saluda educadamente a todo el mundo"] },
  { id: 18, title: "The Sound of Music", image: "/cards/sound-of-music.jpg", sentiment: "positive", description: "A spirited governess fills a family's home with music and hope.", hints: ["Gira en círculos con los brazos extendidos", "Dirige a unos niños cantando con la mano", "Rasguea una guitarra invisible y canta", "Cuenta 'do-re-mi' subiendo una escala con la mano"] },
  { id: 19, title: "Teletubbies", image: "/cards/teletubbies.jpg", sentiment: "positive", description: "Four cheerful creatures play and giggle under a sunny, friendly sky.", hints: ["Levanta cuatro dedos y ríete", "Haz forma de antena sobre tu cabeza", "Date palmaditas en la barriga como una pantalla de TV", "Agita ambos brazos y di '¡eh-oh!'"] },
  { id: 20, title: "Willy Wonka", image: "/cards/willy-wonka.jpg", sentiment: "positive", description: "A golden ticket opens the doors to a magical world of pure imagination.", hints: ["Tócate una chistera y haz girar un bastón invisible", "Levanta un billete dorado y resopla de alegría", "Desenvuelve una chocolatina y dale un buen mordisco", "Abre el brazo para presumir de una sala"] },
];
