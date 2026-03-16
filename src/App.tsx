import { SeqViz } from "seqviz";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <SeqViz
        name="Test Sequence"
        seq="ATCGATCGATCGATCGATCGATCG"
        annotations={[
          {
            name: "Promoter",
            start: 0,
            end: 10,
            direction: 1,
            color: "#8FBC8F",
          },
        ]}
        viewer="both"
      />
    </div>
  );
}

export default App;
