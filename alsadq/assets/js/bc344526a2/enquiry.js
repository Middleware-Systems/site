// enquiry.js: the enquiry is written into an email the visitor sends from their own app. Nothing leaves this page.

export function initEnquiry(form, data) {
  const send = form.querySelector("a.send");
  const write = () => {
    const areas = [...form.querySelectorAll("input[name=area]:checked")].map((i) => i.dataset.label);
    const gov = form.querySelector("select[name=gov]");
    const org = form.querySelector("input[name=org]").value.trim();
    const msg = form.querySelector("textarea[name=msg]").value.trim();
    const t = data.t;
    const subject = [t.mailSubject, areas[0], gov.value ? gov.selectedOptions[0].textContent : ""].filter(Boolean).join(" · ");
    const lines = [];
    if (org) lines.push(`${t.mailOrg}: ${org}`);
    if (areas.length) lines.push(`${t.mailAreas}: ${areas.join(", ")}`);
    if (gov.value) lines.push(`${t.mailGov}: ${gov.selectedOptions[0].textContent}`);
    if (msg) lines.push("", msg);
    send.href = `mailto:${data.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };
  form.addEventListener("input", write);
  form.addEventListener("change", write);
  form.addEventListener("submit", (e) => { e.preventDefault(); write(); send.click(); });
  write();
}
