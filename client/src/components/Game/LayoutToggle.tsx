import { LayoutMode, useLayout } from "../../contexts/LayoutContext";

const modes: { value: LayoutMode; label: string }[] = [
  { value: "A", label: "Classic" },
  { value: "B", label: "War Table" },
  { value: "C", label: "Full Art" },
];

export function LayoutToggle() {
  const { layout, setLayout } = useLayout();

  return (
    <div className="fixed top-3 right-3 z-10 flex rounded-lg overflow-hidden border border-stone-600"
      style={{ background: 'linear-gradient(180deg, #1e170f, #14100a)' }}
    >
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setLayout(m.value)}
          className={`px-3 py-1.5 text-xs font-medieval transition-all ${
            layout === m.value
              ? "text-gold bg-stone-700/60 shadow-inner"
              : "text-stone-400 hover:text-parchment hover:bg-stone-800/40"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
