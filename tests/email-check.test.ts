import { afterEach, describe, expect, it, vi } from "vitest";
import { domainAcceptsMail, suggestEmail } from "@/lib/email-check";

describe("email typo suggestions", () => {
  it("corrects common slips in well-known domains", () => {
    expect(suggestEmail("thunderlight2477@gmail.coom")).toBe("thunderlight2477@gmail.com");
    expect(suggestEmail("a@gmial.com")).toBe("a@gmail.com");
    expect(suggestEmail("a@gmail.con")).toBe("a@gmail.com");
    expect(suggestEmail("a@yaho.com")).toBe("a@yahoo.com");
    expect(suggestEmail("a@hotmial.com")).toBe("a@hotmail.com");
  });

  it("leaves correct and unrelated domains alone", () => {
    expect(suggestEmail("a@gmail.com")).toBeNull();
    expect(suggestEmail("info@nobyst.com")).toBeNull();
    expect(suggestEmail("info.rbsgh@gmail.com")).toBeNull();
    expect(suggestEmail("not-an-email")).toBeNull();
  });
});

describe("mail domain check", () => {
  afterEach(() => vi.unstubAllGlobals());
  const dns = (answers: Record<string, { Status: number; Answer?: { type: number }[] }>) =>
    vi.stubGlobal("fetch", async (url: string) => {
      const type = new URL(url).searchParams.get("type")!;
      return new Response(JSON.stringify(answers[type]));
    });

  it("refuses domains that do not exist or have no mail server", async () => {
    dns({ MX: { Status: 3 }, A: { Status: 3 } });
    expect(await domainAcceptsMail("a@gmail.coom")).toBe(false);
    dns({ MX: { Status: 0 }, A: { Status: 0 } });
    expect(await domainAcceptsMail("a@nothing-here.example")).toBe(false);
    expect(await domainAcceptsMail("a@not a domain")).toBe(false);
  });

  it("accepts domains with MX or an address record, and sends anyway if DNS is down", async () => {
    dns({ MX: { Status: 0, Answer: [{ type: 15 }] }, A: { Status: 0 } });
    expect(await domainAcceptsMail("a@gmail.com")).toBe(true);
    dns({ MX: { Status: 0 }, A: { Status: 0, Answer: [{ type: 1 }] } });
    expect(await domainAcceptsMail("a@small.example")).toBe(true);
    vi.stubGlobal("fetch", async () => new Response("", { status: 503 }));
    expect(await domainAcceptsMail("a@gmail.com")).toBe(true);
  });
});
