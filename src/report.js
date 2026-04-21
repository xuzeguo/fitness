import { marked } from "marked";
import "./styles/report.css";

marked.setOptions({ gfm: true, breaks: false });

async function main() {
  const res = await fetch(`${import.meta.env.BASE_URL}report.md`, { cache: "no-store" });
  if (!res.ok) {
    document.getElementById("content").textContent = `无法加载 report.md：${res.status}`;
    return;
  }
  const text = await res.text();
  document.getElementById("content").innerHTML = marked.parse(text);
}

main().catch((e) => {
  document.getElementById("content").textContent = String(e?.message || e);
});
