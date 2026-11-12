// Desplegable de materias de "Cercanos". Se abre debajo de la barra de búsqueda.
import { Check } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import type { Subject } from '@/types/models';

export function SubjectDropdown({
  subjects,
  isLoading,
  selectedId,
  onSelect,
}: {
  subjects: Subject[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityRole="menu"
      className="overflow-hidden rounded-2xl border border-line-brand bg-surface shadow-md">
      {isLoading ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        // Alto máximo: con muchas materias se scrollea dentro del desplegable.
        <ScrollView
          style={{ maxHeight: 300 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled>
          <Option
            label="Todas las materias"
            selected={selectedId === null}
            onPress={() => onSelect(null)}
          />
          {subjects?.map((s) => (
            <Option
              key={s.id}
              label={s.name}
              count={s.teachersInRange}
              selected={selectedId === s.id}
              onPress={() => onSelect(s.id)}
            />
          ))}
          {subjects && subjects.length === 0 ? (
            <Text className="px-4 py-3 text-sm text-fg-muted">
              Todavía no hay materias cargadas.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Option({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const empty = count === 0;
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count} profesores cerca`}
      onPress={onPress}
      className={`flex-row items-center gap-3 border-b border-line px-4 py-3 active:bg-muted ${selected ? 'bg-brand-soft' : ''}`}>
      <Text
        className={`flex-1 text-base ${selected ? 'font-semibold text-brand-fg' : empty ? 'text-fg-soft' : 'text-fg'}`}
        numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text className={`text-sm ${empty ? 'text-fg-soft' : 'text-fg-muted'}`}>{count}</Text>
      ) : null}
      <View style={{ width: 18 }}>
        {selected ? <Check size={18} color={colors.brandFg} /> : null}
      </View>
    </Pressable>
  );
}
