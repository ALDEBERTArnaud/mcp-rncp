import { createReadStream } from "node:fs";
import { SaxesParser } from "saxes";

export type XmlNode = {
  name: string;
  text: string;
  children: XmlNode[];
};

// Streams a V4.1 export and yields one XmlNode tree per <FICHE>.
export async function* iterFiches(path: string): AsyncGenerator<XmlNode> {
  const parser = new SaxesParser();
  const stack: XmlNode[] = [];
  const queue: XmlNode[] = [];
  let error: Error | null = null;

  parser.on("opentag", (tag) => {
    const node: XmlNode = { name: tag.name, text: "", children: [] };
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    stack.push(node);
  });
  parser.on("text", (t) => {
    const cur = stack[stack.length - 1];
    if (cur) cur.text += t;
  });
  parser.on("cdata", (t) => {
    const cur = stack[stack.length - 1];
    if (cur) cur.text += t;
  });
  parser.on("closetag", (tag) => {
    const node = stack.pop();
    if (node && tag.name === "FICHE") {
      queue.push(node);
    } else if (stack.length === 1 && node && tag.name === "VERSION_FLUX") {
      queue.push(node);
    }
    if (stack.length === 1 && stack[0]) stack[0].children.length = 0;
  });
  parser.on("error", (e) => {
    error = e;
  });

  for await (const chunk of createReadStream(path, { encoding: "utf8", highWaterMark: 1 << 20 })) {
    parser.write(chunk as string);
    if (error) throw error;
    while (queue.length) yield queue.shift() as XmlNode;
  }
  parser.close();
  while (queue.length) yield queue.shift() as XmlNode;
}

export function child(node: XmlNode | undefined, ...path: string[]): XmlNode | undefined {
  let cur = node;
  for (const name of path) {
    cur = cur?.children.find((c) => c.name === name);
    if (!cur) return undefined;
  }
  return cur;
}

export function children(node: XmlNode | undefined, ...path: string[]): XmlNode[] {
  const last = path.pop();
  const parent = path.length ? child(node, ...path) : node;
  return parent?.children.filter((c) => c.name === last) ?? [];
}

export function text(node: XmlNode | undefined, ...path: string[]): string | null {
  const t = child(node, ...path)?.text.trim();
  return t ? t : null;
}
