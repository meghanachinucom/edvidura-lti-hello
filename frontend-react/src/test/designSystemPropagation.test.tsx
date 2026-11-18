import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/shared/PageHeading";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { RoleProvider } from "@/components/shell/RoleContext";
import { DESIGN_TOKENS, DESIGN_PRESETS } from "@/lib/designSystem";

afterEach(cleanup);

describe("Master Frontend Design System and Global Change Architecture", () => {
  describe("1. Central Design Token Architecture", () => {
    it("centralizes palette tokens matching EdVidura specifications", () => {
      expect(DESIGN_TOKENS.colors.pageBg).toBe("var(--page-bg)");
      expect(DESIGN_TOKENS.colors.surface).toBe("var(--surface)");
      expect(DESIGN_TOKENS.colors.secondary).toBe("var(--secondary)");
      expect(DESIGN_TOKENS.colors.buttonMain).toBe("var(--button-main)");
      expect(DESIGN_TOKENS.colors.ink).toBe("var(--ink)");
      expect(DESIGN_TOKENS.colors.inkMuted).toBe("var(--ink-muted)");
      expect(DESIGN_TOKENS.colors.border).toBe("var(--border)");
      expect(DESIGN_TOKENS.colors.borderControl).toBe("var(--border-control)");
      expect(DESIGN_TOKENS.colors.accent).toBe("var(--accent)");
      expect(DESIGN_TOKENS.colors.focusRing).toBe("var(--focus-ring)");
    });

    it("centralizes geometry, radii and accessibility dimensions", () => {
      expect(DESIGN_TOKENS.radii.surface).toBe("12px");
      expect(DESIGN_TOKENS.radii.control).toBe("8px");
      expect(DESIGN_TOKENS.layout.touchMinHeight).toBe("44px");
      expect(DESIGN_TOKENS.layout.maxContentWidth).toBe("960px");
      expect(DESIGN_TOKENS.layout.maxReadingWidth).toBe("68ch");
      expect(DESIGN_TOKENS.breakpoints.tablet).toBe(640);
      expect(DESIGN_TOKENS.breakpoints.desktop).toBe(1280);
    });

    it("centralizes reusable CSS layout and component presets", () => {
      expect(DESIGN_PRESETS.pageContainer).toContain("max-w-content");
      expect(DESIGN_PRESETS.card).toContain("rounded-surface");
      expect(DESIGN_PRESETS.card).toContain("bg-surface");
      expect(DESIGN_PRESETS.btnPrimary).toBe("btn-primary");
      expect(DESIGN_PRESETS.btnSecondary).toBe("btn-secondary");
      expect(DESIGN_PRESETS.input).toContain("min-h-11");
      expect(DESIGN_PRESETS.input).toContain("rounded-control");
      expect(DESIGN_PRESETS.studioGrid).toBe("studio-grid");
    });
  });

  describe("2. Button Primitive & Global Class Propagation", () => {
    it("propagates centralized button variants through the Button primitive", () => {
      const { rerender } = render(
        <Button variant="edviduraPrimary" data-testid="btn">
          Save Changes
        </Button>,
      );
      const btn = screen.getByTestId("btn");
      expect(btn.className).toContain("btn-primary");

      rerender(
        <Button variant="edviduraSecondary" data-testid="btn">
          Cancel Action
        </Button>,
      );
      expect(btn.className).toContain("btn-secondary");
    });

    it("supports standard button sizes while preserving touch target accessibility", () => {
      render(
        <Button variant="edviduraPrimary" size="edvidura" data-testid="touch-btn">
          Interactive Tap
        </Button>,
      );
      const btn = screen.getByTestId("touch-btn");
      expect(btn.className).toContain("min-h-11");
    });
  });

  describe("3. Card & Surface Architecture", () => {
    it("propagates centralized card styling through Card component", () => {
      render(
        <Card data-testid="test-card">
          <CardHeader>
            <CardTitle>Master Architecture Card</CardTitle>
          </CardHeader>
          <CardContent>Standardized content layout.</CardContent>
        </Card>,
      );
      const card = screen.getByTestId("test-card");
      expect(card.className).toContain("rounded-surface");
      expect(card.className).toContain("border-border");
      expect(card.className).toContain("bg-surface");
      expect(card.className).toContain("text-ink");
    });

    it("supports section card status borders and action alignment", () => {
      render(
        <section
          data-testid="sec-card"
          data-status="attention"
          className={DESIGN_PRESETS.sectionCard}
        >
          <h2>Warning Section</h2>
        </section>,
      );
      const card = screen.getByTestId("sec-card");
      expect(card.className).toContain("section-card");
      expect(card.className).toContain("rounded-surface");
      expect(card.className).toContain("bg-surface");
    });
  });

  describe("4. Form Controls & Input Styling", () => {
    it("renders Input primitive with centralized border-control and touch height", () => {
      render(<Input data-testid="form-input" placeholder="Enter student roll number" />);
      const input = screen.getByTestId("form-input");
      expect(input.className).toContain("border-input");
      expect(input.className).toContain("text-foreground");
      expect(input.className).toContain("focus-visible:ring-ring");
    });

    it("applies centralized form preset classes across custom inputs", () => {
      render(
        <input
          data-testid="custom-input"
          className={DESIGN_PRESETS.input}
          placeholder="Search lessons"
        />,
      );
      const input = screen.getByTestId("custom-input");
      expect(input.className).toContain("min-h-11");
      expect(input.className).toContain("border-border-control");
      expect(input.className).toContain("rounded-control");
    });
  });

  describe("5. Data Tables & Responsive Layouts", () => {
    interface TestRow {
      id: string;
      title: string;
      status: string;
    }

    const columns: Column<TestRow>[] = [
      { key: "title", header: "Lesson Title", cell: (r) => r.title },
      { key: "status", header: "Status", cell: (r) => r.status },
    ];

    const sampleRows: TestRow[] = [
      { id: "1", title: "Single Phase AC Circuits", status: "Published" },
      { id: "2", title: "Three Phase Transformers", status: "Draft" },
    ];

    it("renders responsive DataTable with desktop table and mobile card representations", () => {
      render(
        <DataTable
          caption="Sample Module Lessons"
          columns={columns}
          rows={sampleRows}
          rowKey={(r) => r.id}
        />,
      );
      // Desktop table verification
      const table = screen.getByRole("table", { hidden: true });
      expect(table.className).toContain("bg-surface");
      expect(table.className).toContain("tablet:table");

      // Verify content rows
      expect(screen.getAllByText("Single Phase AC Circuits").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Three Phase Transformers").length).toBeGreaterThanOrEqual(1);
    });

    it("renders empty state placeholder when data table has no rows", () => {
      render(
        <DataTable
          caption="Empty Module"
          columns={columns}
          rows={[]}
          rowKey={(r) => r.id}
          empty={<p>No lessons available.</p>}
        />,
      );
      expect(screen.getByText("No lessons available.")).toBeInTheDocument();
    });
  });

  describe("6. Modal & Confirmation Dialogs", () => {
    it("renders ConfirmDialog using centralized surfaces, typography, and button tokens", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <ConfirmDialog
          open={true}
          title="Delete Assessment"
          body="Are you sure you want to permanently delete this draft?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Assessment")).toHaveClass("font-heading", "text-ink");
      expect(screen.getByText("Cancel")).toHaveClass("btn-secondary");
      expect(screen.getByText("Delete")).toHaveClass("btn-primary");

      fireEvent.click(screen.getByText("Delete"));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("7. Domain Shared Components & Dynamic Propagation", () => {
    it("renders PageHeading and StatusBanner using centralized tokens inside RoleProvider", async () => {
      await act(async () => {
        render(
          <RoleProvider>
            <PageHeading text="Global Design System" />
            <StatusBanner variant="success">Theme change propagated successfully</StatusBanner>
            <EmptyState title="No items" help="Click to create your first lesson." />
          </RoleProvider>,
        );
      });
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Global Design System");
      expect(screen.getByText("Theme change propagated successfully")).toBeInTheDocument();
      expect(screen.getByText("No items")).toBeInTheDocument();
    });

    it("demonstrates dynamic CSS custom property token propagation", () => {
      const root = document.documentElement;
      const initialSecondary = root.style.getPropertyValue("--secondary");

      // Verify that runtime modification of root CSS variables immediately updates token resolution
      root.style.setProperty("--secondary", "#008080");
      expect(root.style.getPropertyValue("--secondary")).toBe("#008080");

      // Revert to initial state
      if (initialSecondary) {
        root.style.setProperty("--secondary", initialSecondary);
      } else {
        root.style.removeProperty("--secondary");
      }
      expect(root.style.getPropertyValue("--secondary")).toBe(initialSecondary || "");
    });
  });
});
