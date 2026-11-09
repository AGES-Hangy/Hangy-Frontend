import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/Skeleton';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const metrics = layout.reportCard;
/** Mesmo `numberOfLines` do trecho no ReportCard. */
const EXCERPT_LINES = 2;
/** Como no ReportCard: o padding de 12 do Figma conta a partir da borda externa. */
const CARD_PADDING = spacing[12] - metrics.borderWidth;

/** Larguras das barras, em fração da largura disponível. */
const TITLE_WIDTH = '60%';
const SUBTITLE_WIDTH = '45%';
const BADGE_WIDTH = '25%';
const REASON_WIDTH = '50%';
const EXCERPT_LAST_LINE_WIDTH = '75%';
const REPORT_NUMBER_WIDTH = '30%';

type ReportCardSkeletonProps = {
  /** O card real terá `reportNumber`: reserva o texto no rodapé. */
  showReportNumber?: boolean;
};

/** Moldura na métrica do `ReportCard`, para a lista não saltar ao carregar. */
export function ReportCardSkeleton({ showReportNumber = false }: ReportCardSkeletonProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={metrics.thumbSize} height={metrics.thumbSize} radius="full" />
        <View style={styles.headerText}>
          <Skeleton width={TITLE_WIDTH} height={typography.labelM.lineHeight} radius="full" />
          <Skeleton width={SUBTITLE_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
        </View>
        <Skeleton width={BADGE_WIDTH} height={layout.badge.height} radius="full" />
      </View>
      <Skeleton width={REASON_WIDTH} height={typography.labelS.lineHeight} radius="full" />
      <View style={styles.excerpt}>
        <Skeleton height={typography.bodyS.fontSize} radius="full" />
        <Skeleton width={EXCERPT_LAST_LINE_WIDTH} height={typography.bodyS.fontSize} radius="full" />
      </View>
      <View style={[styles.footer, !showReportNumber && styles.footerChevronOnly]}>
        {showReportNumber && (
          <Skeleton width={REPORT_NUMBER_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
        )}
        <Skeleton width={metrics.chevronSize} height={metrics.chevronSize} radius="xs" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[8],
    padding: CARD_PADDING,
    borderWidth: metrics.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  headerText: {
    flex: 1,
    gap: metrics.titleGap,
  },
  // Duas barras da altura da fonte dentro de duas linhas de texto: o trecho real ocupa a mesma altura.
  excerpt: {
    height: typography.bodyS.lineHeight * EXCERPT_LINES,
    justifyContent: 'space-around',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerChevronOnly: {
    justifyContent: 'flex-end',
  },
});
