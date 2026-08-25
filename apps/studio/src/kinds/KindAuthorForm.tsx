"use client";

import { useEffect, useState } from "react";
import type { KindField, KindFieldType, KindManifest, PortDef } from "@machina/core";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { KIND_CATEGORIES, PORT_TYPES } from "./validate-kind.ts";

export type KindLibraryCallbacks = {
  publishKind?: (
    manifest: KindManifest,
    opts?: { homedir?: string; overwrite?: boolean },
  ) => Promise<"ok" | "confirm">;
  addFromLibrary?: (id: string, opts?: { homedir?: string }) => Promise<KindManifest>;
  listLibraryKinds?: (opts?: { homedir?: string }) => Promise<KindManifest[]>;
  libraryNewer?: (
    name: string,
    pinHash: string,
    libraryManifest: KindManifest,
  ) => Promise<string | null>;
};

type PortDraft = PortDef;
type FieldDraft = KindField & { optionsText: string; defaultText: string };

const emptyPort = (): PortDraft => ({
  name: "",
  dir: "in",
  type: "CLOCK",
  cardinality: "exclusive",
  label: "",
});

const emptyField = (): FieldDraft => ({
  key: "",
  label: "",
  type: "string",
  optionsText: "",
  defaultText: "",
});

function toManifest(
  id: string,
  name: string,
  category: KindManifest["category"],
  cardColor: string,
  ports: PortDraft[],
  fields: FieldDraft[],
): KindManifest {
  const portRecord: Record<string, PortDef> = {};
  for (const port of ports) {
    if (!port.name) continue;
    portRecord[port.name] = { ...port, name: port.name };
  }
  return {
    schemaVersion: 1,
    id: id.trim(),
    version: 1,
    name: name.trim(),
    category,
    cardColor: cardColor.trim().toLowerCase(),
    ports: portRecord,
    fields: fields.filter((field) => field.key).map(draftToField),
  };
}

function draftToField(field: FieldDraft): KindField {
  const next: KindField = {
    key: field.key,
    label: field.label,
    type: field.type,
  };
  if (field.type === "enum") {
    const options = field.optionsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (options.length > 0) {
      next.options = options;
    }
  }
  if (field.defaultText !== "") {
    next.default = coerceDefault(field.type, field.defaultText);
  }
  return next;
}

function coerceDefault(type: KindFieldType, raw: string): string | number | boolean {
  if (type === "number") return Number(raw);
  if (type === "boolean") return raw === "true";
  return raw;
}

function fieldsFromManifest(fields: KindField[]): FieldDraft[] {
  return fields.map((field) => ({
    ...field,
    optionsText: (field.options ?? []).join(", "),
    defaultText: field.default === undefined ? "" : String(field.default),
  }));
}

export function KindAuthorForm({ library }: { library?: KindLibraryCallbacks }) {
  const store = useProjectSnapshot();
  const [id, setId] = useState("custom.");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<KindManifest["category"]>("Systems");
  const [cardColor, setCardColor] = useState("#888888");
  const [ports, setPorts] = useState<PortDraft[]>([]);
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const revision = store.getRevision();

  useEffect(() => {
    let cancelled = false;
    async function loadBanner(): Promise<void> {
      if (!library?.listLibraryKinds || !library.libraryNewer) {
        if (!cancelled) setBanner(null);
        return;
      }
      const pin = store.getKindPins().find((item) => item.id === id);
      if (!pin) {
        if (!cancelled) setBanner(null);
        return;
      }
      const listed = await library.listLibraryKinds();
      const copy = listed.find((item) => item.id === id);
      if (!copy) {
        if (!cancelled) setBanner(null);
        return;
      }
      const next = await library.libraryNewer(copy.name, pin.hash, copy);
      if (!cancelled) setBanner(next);
    }
    void loadBanner();
    return () => {
      cancelled = true;
    };
  }, [id, library, revision, store]);

  async function handleSave(): Promise<void> {
    const manifest = toManifest(id, name, category, cardColor, ports, fields);
    setError(await store.upsertKind(manifest));
  }

  async function handlePublish(): Promise<void> {
    if (!library?.publishKind) return;
    const manifest = toManifest(id, name, category, cardColor, ports, fields);
    const first = await library.publishKind(manifest);
    if (first === "confirm") {
      if (!window.confirm("Replace the library copy of this kind?")) return;
      await library.publishKind(manifest, { overwrite: true });
    }
  }

  async function useLibraryVersion(): Promise<void> {
    if (!library?.addFromLibrary) return;
    const copy = await library.addFromLibrary(id);
    await store.upsertKind(copy);
    setId(copy.id);
    setName(copy.name);
    setCategory(copy.category);
    setCardColor(copy.cardColor);
    setPorts(Object.values(copy.ports));
    setFields(fieldsFromManifest(copy.fields));
    setBanner(null);
  }

  return (
    <form
      className="space-y-3 text-sm text-neutral-200"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">New kind</h2>
      {banner ? (
        <div className="space-y-2 rounded border border-amber-800 bg-amber-950/40 p-2 text-xs text-amber-100">
          <p>{banner}</p>
          <button
            type="button"
            className="rounded border border-amber-700 px-2 py-1"
            onClick={() => void useLibraryVersion()}
          >
            Use library version
          </button>
        </div>
      ) : null}
      <label className="block text-xs text-neutral-400">
        Id
        <input
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          value={id}
          onChange={(event) => setId(event.target.value)}
        />
      </label>
      <label className="block text-xs text-neutral-400">
        Name
        <input
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="block text-xs text-neutral-400">
        Category
        <select
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          value={category}
          onChange={(event) => setCategory(event.target.value as KindManifest["category"])}
        >
          {KIND_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-neutral-400">
        Card color
        <input
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          value={cardColor}
          onChange={(event) => setCardColor(event.target.value)}
        />
      </label>
      <PortList ports={ports} setPorts={setPorts} />
      <FieldList fields={fields} setFields={setFields} />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
        >
          Save
        </button>
        <button
          type="button"
          className="flex-1 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
          onClick={() => void handlePublish()}
        >
          Publish
        </button>
      </div>
    </form>
  );
}

function PortList({
  ports,
  setPorts,
}: {
  ports: PortDraft[];
  setPorts: (next: PortDraft[] | ((current: PortDraft[]) => PortDraft[])) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Ports</span>
        <button
          type="button"
          className="text-xs text-neutral-300"
          onClick={() => setPorts((current) => [...current, emptyPort()])}
        >
          Add port
        </button>
      </div>
      {ports.map((port, index) => (
        <div key={index} className="space-y-1 rounded border border-neutral-800 p-2">
          <input
            aria-label={`Port ${index + 1} name`}
            placeholder="name"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={port.name}
            onChange={(event) =>
              setPorts((current) =>
                current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
              )
            }
          />
          <select
            aria-label={`Port ${index + 1} dir`}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={port.dir}
            onChange={(event) =>
              setPorts((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, dir: event.target.value as PortDef["dir"] } : item,
                ),
              )
            }
          >
            <option value="in">in</option>
            <option value="out">out</option>
          </select>
          <select
            aria-label={`Port ${index + 1} type`}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={port.type}
            onChange={(event) =>
              setPorts((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, type: event.target.value as PortDef["type"] } : item,
                ),
              )
            }
          >
            {PORT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            aria-label={`Port ${index + 1} cardinality`}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={port.cardinality}
            onChange={(event) =>
              setPorts((current) =>
                current.map((item, i) =>
                  i === index
                    ? { ...item, cardinality: event.target.value as PortDef["cardinality"] }
                    : item,
                ),
              )
            }
          >
            <option value="exclusive">exclusive</option>
            <option value="fan-in">fan-in</option>
            <option value="fan-out">fan-out</option>
          </select>
          <input
            aria-label={`Port ${index + 1} label`}
            placeholder="label"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={port.label}
            onChange={(event) =>
              setPorts((current) =>
                current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
              )
            }
          />
        </div>
      ))}
    </div>
  );
}

function FieldList({
  fields,
  setFields,
}: {
  fields: FieldDraft[];
  setFields: (next: FieldDraft[] | ((current: FieldDraft[]) => FieldDraft[])) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Inspector fields</span>
        <button
          type="button"
          className="text-xs text-neutral-300"
          onClick={() => setFields((current) => [...current, emptyField()])}
        >
          Add field
        </button>
      </div>
      {fields.map((field, index) => (
        <div key={index} className="space-y-1 rounded border border-neutral-800 p-2">
          <input
            aria-label={`Field ${index + 1} key`}
            placeholder="key"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={field.key}
            onChange={(event) =>
              setFields((current) =>
                current.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)),
              )
            }
          />
          <input
            aria-label={`Field ${index + 1} label`}
            placeholder="label"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={field.label}
            onChange={(event) =>
              setFields((current) =>
                current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
              )
            }
          />
          <select
            aria-label={`Field ${index + 1} type`}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={field.type}
            onChange={(event) =>
              setFields((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, type: event.target.value as KindFieldType } : item,
                ),
              )
            }
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="enum">enum</option>
          </select>
          <input
            aria-label={`Field ${index + 1} default`}
            placeholder="default"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            value={field.defaultText}
            onChange={(event) =>
              setFields((current) =>
                current.map((item, i) =>
                  i === index ? { ...item, defaultText: event.target.value } : item,
                ),
              )
            }
          />
          {field.type === "enum" ? (
            <input
              aria-label={`Field ${index + 1} options`}
              placeholder="options, comma separated"
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
              value={field.optionsText}
              onChange={(event) =>
                setFields((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, optionsText: event.target.value } : item,
                  ),
                )
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
