import { createContext, useContext } from "react";

interface SectionEditorContextValue {
  /** When true, the section is rendered inside the slide-out edit panel.
   *  SectionWrapper and other editors should hide their own header/controls
   *  because the panel chrome provides them. */
  panelMode: boolean;
}

export const SectionEditorContext = createContext<SectionEditorContextValue>({
  panelMode: false,
});

export function useSectionEditorContext() {
  return useContext(SectionEditorContext);
}
