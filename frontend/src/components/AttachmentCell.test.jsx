import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentCell } from "./AttachmentCell.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    deleteAttachment: vi.fn(),
    attachmentUploadUrl: vi.fn(),
    confirmAttachment: vi.fn(),
  },
}));

const workorder = {
  id: "w1",
  attachments: [
    { key: "workorders/w1/a.jpg", filename: "kuva.jpg", url: "https://s3.example.com/a.jpg" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AttachmentCell - liitteen poisto", () => {
  test("näyttää poistonapin jokaiselle liitteelle", () => {
    render(<AttachmentCell workorder={workorder} />);
    expect(screen.getByRole("button", { name: "Poista liite kuva.jpg" })).toBeInTheDocument();
  });

  test("kysyy vahvistuksen ennen poistoa", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    api.deleteAttachment.mockResolvedValue({ attachments: [] });
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} />);
    await user.click(screen.getByRole("button", { name: "Poista liite kuva.jpg" }));

    expect(confirmSpy).toHaveBeenCalledWith('Poistetaanko liite "kuva.jpg"?');
    confirmSpy.mockRestore();
  });

  test("ei kutsu API:a jos käyttäjä perumaa vahvistuksen", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} />);
    await user.click(screen.getByRole("button", { name: "Poista liite kuva.jpg" }));

    expect(api.deleteAttachment).not.toHaveBeenCalled();
    window.confirm.mockRestore();
  });

  test("kutsuu deleteAttachment():ia oikealla työmääräys- ja liite-id:llä vahvistuksen jälkeen", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.deleteAttachment.mockResolvedValue({ attachments: [] });
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} />);
    await user.click(screen.getByRole("button", { name: "Poista liite kuva.jpg" }));

    await waitFor(() =>
      expect(api.deleteAttachment).toHaveBeenCalledWith("w1", "workorders/w1/a.jpg")
    );
    window.confirm.mockRestore();
  });

  test("kutsuu onAttachmentsChanged():ia onnistuneen poiston jälkeen", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.deleteAttachment.mockResolvedValue({ attachments: [] });
    const onAttachmentsChanged = vi.fn();
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} onAttachmentsChanged={onAttachmentsChanged} />);
    await user.click(screen.getByRole("button", { name: "Poista liite kuva.jpg" }));

    await waitFor(() => expect(onAttachmentsChanged).toHaveBeenCalledTimes(1));
    window.confirm.mockRestore();
  });

  test("näyttää virheilmoituksen jos poisto epäonnistuu, eikä kutsu onAttachmentsChanged():ia", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.deleteAttachment.mockRejectedValue(new Error("Liitettä ei löytynyt."));
    const onAttachmentsChanged = vi.fn();
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} onAttachmentsChanged={onAttachmentsChanged} />);
    await user.click(screen.getByRole("button", { name: "Poista liite kuva.jpg" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Liitettä ei löytynyt."));
    expect(onAttachmentsChanged).not.toHaveBeenCalled();

    window.confirm.mockRestore();
    alertSpy.mockRestore();
  });

  test("poistonappi on pois käytöstä juuri kyseisen liitteen poiston ajan", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolveDelete;
    api.deleteAttachment.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} />);
    const button = screen.getByRole("button", { name: "Poista liite kuva.jpg" });
    await user.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    resolveDelete({ attachments: [] });
    await waitFor(() => expect(button).not.toBeDisabled());

    window.confirm.mockRestore();
  });

  test("ei näytä poistonappeja kun liitteitä ei ole", () => {
    render(<AttachmentCell workorder={{ id: "w2", attachments: [] }} />);
    expect(screen.queryByRole("button", { name: /poista liite/i })).not.toBeInTheDocument();
  });
});

describe("AttachmentCell - kuvakkeet", () => {
  test("näyttää pienoiskuvan kuvatiedostolle", () => {
    render(<AttachmentCell workorder={workorder} />);
    expect(screen.getByAltText("kuva.jpg")).toBeInTheDocument();
  });

  test("näyttää liite-ikonin ei-kuvatiedostolle", () => {
    const withPdf = {
      id: "w1",
      attachments: [{ key: "workorders/w1/b.pdf", filename: "raportti.pdf", url: "https://s3.example.com/b.pdf" }],
    };
    render(<AttachmentCell workorder={withPdf} />);
    expect(screen.queryByAltText("raportti.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("📎")).toBeInTheDocument();
  });
});

describe("AttachmentCell - lataus", () => {
  afterEach(() => {
    if (global.fetch?.mockRestore) global.fetch.mockRestore();
  });

  test("lataa tiedoston S3:aan ja vahvistaa liitteen backendille", async () => {
    api.attachmentUploadUrl.mockResolvedValue({
      key: "workorders/w1/new.png",
      uploadUrl: "https://s3.example.com/upload",
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    api.confirmAttachment.mockResolvedValue({ attachments: [] });
    const onAttachmentsChanged = vi.fn();
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} onAttachmentsChanged={onAttachmentsChanged} />);

    const file = new File(["sisältö"], "uusi.png", { type: "image/png" });
    await user.upload(document.querySelector('input[type="file"]'), file);

    await waitFor(() =>
      expect(api.attachmentUploadUrl).toHaveBeenCalledWith("w1", "uusi.png", "image/png")
    );
    await waitFor(() =>
      expect(api.confirmAttachment).toHaveBeenCalledWith("w1", "workorders/w1/new.png", "uusi.png")
    );
    await waitFor(() => expect(onAttachmentsChanged).toHaveBeenCalledTimes(1));
  });

  test("näyttää virheen jos S3-lataus epäonnistuu", async () => {
    api.attachmentUploadUrl.mockResolvedValue({
      key: "workorders/w1/new.png",
      uploadUrl: "https://s3.example.com/upload",
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    render(<AttachmentCell workorder={workorder} />);
    const file = new File(["sisältö"], "uusi.png", { type: "image/png" });
    await user.upload(document.querySelector('input[type="file"]'), file);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Kuvan lataus S3:aan epäonnistui.")
    );
    expect(api.confirmAttachment).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
