import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill.jsx";

describe("StatusPill", () => {
  test("näyttää tunnetun statuksen suomenkielisen tekstin", () => {
    render(<StatusPill status="overdue" />);
    expect(screen.getByText("Myöhässä")).toBeInTheDocument();
  });

  test("käyttää annettua label-propsia jos se on asetettu", () => {
    render(<StatusPill status="ok" label="Mukautettu teksti" />);
    expect(screen.getByText("Mukautettu teksti")).toBeInTheDocument();
  });

  test("näyttää raa'an statuksen jos sitä ei tunneta", () => {
    render(<StatusPill status="tuntematon_tila" />);
    expect(screen.getByText("tuntematon_tila")).toBeInTheDocument();
  });

  test("lisää statuksen mukaisen CSS-luokan", () => {
    render(<StatusPill status="maintenance_due" />);
    expect(screen.getByText("Huolto lähestyy")).toHaveClass("pill-maintenance_due");
  });
});
