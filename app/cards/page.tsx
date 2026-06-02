import CardDeck from "../components/CardDeck";

// Standalone "draw a movie" screen. Renders the card-fan full-viewport.
export default function CardsPage() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        padding:
          "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
      }}
    >
      <CardDeck />
    </main>
  );
}
