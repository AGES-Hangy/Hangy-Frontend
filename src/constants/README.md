# Design tokens (`src/constants`)

Tokens do [Style Guide](../../) da Hangy, prontos para uso em componentes e telas.

- [colors.ts](./colors.ts) — `palette` (cores cruas) e `colors` (tokens semânticos de aplicação)
- [typography.ts](./typography.ts) — `typography` (estilos de texto) e `fontFamily`
- [layout.ts](./layout.ts) — `radius`, `spacing` e `elevation`

Todos são importados com o alias `@/*`, que resolve para `src/*`:

```ts
import { colors, palette } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { radius, spacing, elevation } from '@/constants/layout';
```

## Regra geral

Nunca usar hexadecimais, `fontSize`/`lineHeight` ou `padding`/`margin` soltos direto num
componente — sempre puxar do token correspondente. Isso é o que garante que trocar uma cor
ou um espaçamento no guia de estilo propague pro app inteiro.

## Cores

Prefira sempre `colors` (tokens de aplicação) a `palette` (cores cruas). `palette` só deve
ser usado quando não existe um token semântico equivalente ainda em `colors`.

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

function Card() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Futebol na PUC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.default,
    borderWidth: 1,
  },
  title: {
    color: colors.text.primary,
  },
});
```

## Tipografia

Cada estilo de `typography` já traz `fontSize`, `lineHeight`, `fontWeight` e `letterSpacing`
juntos — espalhe (`...`) dentro do style em vez de montar essas propriedades na mão:

```tsx
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  meta: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});
```

`fontFamily.base` ('Inter') existe como token, mas a fonte ainda não está carregada no app
(sem `expo-font`/`useFonts` configurado) — não aplique `fontFamily` nos componentes até essa
etapa ser feita, ou o texto vai quebrar para o fallback do sistema silenciosamente.

## Raio, espaçamento e elevação

`spacing` segue a grade de 4pt (chaves numéricas: `spacing[16]`, `spacing[24]`, etc.).
`radius` cobre os raios de borda. `elevation` já vem como objeto pronto de sombra
(`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`) — espalhe
direto no style, sem escrever sombra na mão:

```tsx
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
import { radius, spacing, elevation } from '@/constants/layout';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing[16],
    marginBottom: spacing[12],
    backgroundColor: colors.surface.card,
    ...elevation[1],
  },
});
```

## Onde isso já é usado

[TopAppBar](../components/TopAppBar/index.tsx) e a tela [Home](../app/(tabs)/(screens)/Home/index.tsx)
já consomem `colors` — use-os como referência de import/estrutura ao adicionar `typography` e
`layout` em telas novas ou existentes.
