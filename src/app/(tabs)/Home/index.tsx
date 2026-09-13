import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BottomNav } from "@/components/BottomNav";
import { TopAppBar } from "@/components/TopAppBar";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { useFeed, type FeedEvent, type FeedSection } from "@/hooks/useFeed";
import { useRefreshable } from "@/hooks/useRefreshable";

/**
 * ⚠️ PLACEHOLDER — o `EventCard` de verdade está em review (com erros) e
 * ainda não entrou no repo. Isto não é entrega da task 115, é só o
 * suficiente pra Home renderizar algo e o pull-to-refresh ter o que
 * atualizar. Trocar pelo componente oficial assim que ele mergear; o resto
 * do arquivo não precisa mudar.
 */
function EventCardPlaceholder({ item }: { item: FeedEvent }) {
  const date = new Date(item.eventDate);
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")} · ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

  return (
    <View style={placeholderStyles.card}>
      <Text
        style={[typography.labelM, placeholderStyles.title]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      <Text style={[typography.bodyS, placeholderStyles.meta]}>
        {formattedDate} · {item.locationName}
      </Text>
      <Text style={[typography.bodyS, placeholderStyles.meta]}>
        {item.participantsCount} participantes
      </Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  card: {
    width: 220,
    padding: spacing[12],
    borderRadius: 14,
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    gap: spacing[4],
  },
  title: { color: colors.text.primary },
  meta: { color: colors.text.secondary },
});

export default function Home() {
  const { sections, error, refetch } = useFeed();
  const { isRefreshing, onRefresh } = useRefreshable(refetch);

  // Skeleton de carga inicial, "Ver todos" por seção e o carrossel horizontal
  // por categoria (visível no Figma) pertencem às tasks irmãs desta US, não
  // à 115. Aqui é só o essencial pra não quebrar a tela enquanto elas não
  // existem — uma SectionList vertical simples.
  return (
    <View style={styles.container}>
      <TopAppBar variant="Home" />

      <SectionList<FeedEvent, FeedSection>
        sections={sections}
        keyExtractor={(item) => item.eventId}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={typography.h4}>{section.tag.name}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <EventCardPlaceholder item={item} />
          </View>
        )}
        contentContainerStyle={styles.content}
        // Núcleo da task 115: não mostra skeleton e não apaga conteúdo em
        // erro — só o indicador nativo, tintado com o token de cor.
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.action.primary}
            colors={[colors.action.primary]}
          />
        }
      />

      {error && !isRefreshing && sections.length === 0 && (
        <Text style={[typography.bodyM, styles.errorText]}>{error}</Text>
      )}

      <BottomNav active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[16],
  },
  sectionHeader: {
    paddingVertical: spacing[8],
  },
  cardWrapper: {
    marginBottom: spacing[12],
  },
  errorText: {
    textAlign: "center",
    color: colors.feedback.error,
    padding: spacing[16],
  },
});
