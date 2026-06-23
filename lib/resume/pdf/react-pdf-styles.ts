import { StyleSheet } from "@react-pdf/renderer";
import { RESUME_TOKENS } from "@/lib/resume/template-tokens";
import { FONT_FAMILY } from "./react-pdf-setup";

const { colors, fontSize, spacing } = RESUME_TOKENS;

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.body,
    lineHeight: 1.5,
    color: colors.primary,
    padding: spacing.pagePadding,
    backgroundColor: colors.paper,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.name,
    fontWeight: "bold",
    lineHeight: 1.35,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.subtitle,
    lineHeight: 1.5,
    color: colors.muted,
  },
  contact: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.small,
    lineHeight: 1.5,
    color: colors.muted,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.sectionTitle,
    fontWeight: "bold",
    lineHeight: 1.5,
    color: colors.accent,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: spacing.sectionGap,
  },
  sectionFirst: {
    marginTop: 0,
  },
  bodyText: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.body,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  itemTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.body,
    fontWeight: "bold",
    lineHeight: 1.5,
    flex: 1,
  },
  itemMeta: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.small,
    lineHeight: 1.5,
    color: colors.muted,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletMark: {
    fontFamily: FONT_FAMILY,
    width: 10,
    fontSize: fontSize.body,
    lineHeight: 1.5,
  },
  bulletText: {
    fontFamily: FONT_FAMILY,
    flex: 1,
    fontSize: fontSize.body,
    lineHeight: 1.5,
  },
  itemBlock: {
    marginBottom: spacing.itemGap + 6,
  },
  skillLine: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.body,
    lineHeight: 1.5,
    marginBottom: 4,
  },
});

export const classicStyles = StyleSheet.create({
  header: {
    flexDirection: "column",
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 14,
    marginBottom: 18,
  },
});

export const modernStyles = StyleSheet.create({
  page: {
    padding: 0,
  },
  header: {
    flexDirection: "column",
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: 24,
    paddingBottom: 26,
    color: "#ffffff",
  },
  headerName: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.name,
    fontWeight: "bold",
    lineHeight: 1.35,
    color: "#ffffff",
  },
  headerSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.subtitle,
    lineHeight: 1.5,
    color: "#ecfdf5",
  },
  headerContact: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.small,
    lineHeight: 1.5,
    color: "#d1fae5",
  },
  body: {
    padding: spacing.pagePadding,
  },
});

export const sidebarStyles = StyleSheet.create({
  page: {
    padding: 0,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 150,
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 28,
    flexDirection: "column",
    color: "#ffffff",
  },
  sidebarName: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 1.4,
    color: "#ffffff",
  },
  sidebarSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: fontSize.small,
    lineHeight: 1.5,
    color: "#d4d4d8",
  },
  sidebarContact: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 1.5,
    color: "#a1a1aa",
  },
  main: {
    marginLeft: 150,
    padding: spacing.pagePadding,
    minHeight: "100%",
  },
});
