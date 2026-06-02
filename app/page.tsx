import CameraCapture from "./components/CameraCapture";

export default function Home() {
  return (
    <main className="stage-wrap">
      <div className="playbill">
        <header className="masthead">
          <p className="kicker">Cursor Madrid · Hack III presenta</p>
          <div className="deco-rule">
            <span>★</span>
          </div>
          <h1 className="title">AI Charades</h1>
          <div className="bulbs">
            <i /><i /><i /><i /><i /><i />
          </div>
          <p className="subtitle">Una película muda en un acto</p>
        </header>

        <CameraCapture />
      </div>

      <p className="colophon">Mímica · Cámara · Aplauso</p>
    </main>
  );
}
