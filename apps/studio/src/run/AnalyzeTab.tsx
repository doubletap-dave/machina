"use client";

type AnalyzeTabProps = {
  maxTurn: number;
  turn: number;
  onRewind: (turn: number) => void;
};

export function AnalyzeTab({ maxTurn, turn, onRewind }: AnalyzeTabProps) {
  return (
    <label>
      Turn
      <input
        type="range"
        min={0}
        max={maxTurn}
        value={turn}
        onChange={(event) => onRewind(Number(event.target.value))}
      />
    </label>
  );
}
