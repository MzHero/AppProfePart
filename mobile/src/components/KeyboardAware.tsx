// Formularios y chat que no quedan tapados por el teclado, sea cual sea el teclado del usuario
// (con barra de sugerencias o de herramientas, emojis, otro tamaño...).
//
// - KeyboardAvoider: deja abajo exactamente el espacio que tapa el teclado. Todo se cuenta en
//   coordenadas de la VENTANA de la app (las de measureInWindow), nunca mezcladas con las de pantalla:
//   en Android (Expo Go) la ventana empieza debajo de la barra de estado y termina arriba de la barra
//   de navegación, y el borde del teclado viene en coordenadas de pantalla. Mezclarlas dejaba la caja
//   de texto tapada justo el alto de la barra de estado.
//     tapa = cuánto se mete el teclado en la ventana:
//            ventana hasta abajo de la pantalla (iOS, edge-to-edge): pantalla - bordeTeclado
//            ventana arriba de la barra de navegación (Android):    alto del teclado (sin esa barra)
//     espacio = tapa - (lo que ya separa al contenedor del borde inferior de la ventana)
//   El alto del teclado incluye su barra de sugerencias o de herramientas, y Android vuelve a avisar
//   cuando cambia con el teclado abierto.
//   No se usan los KeyboardAvoidingView de RN ni de keyboard-controller: calculaban corto en Android.
// - FocusScrollView: ScrollView que, cuando se achica por el teclado, lleva a la vista el campo
//   enfocado.
// - KeyboardScrollView: los dos juntos (pantallas con formulario).
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  TextInput,
  View,
  type KeyboardEvent,
  type KeyboardMetrics,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Espacio que queda entre el campo enfocado y el teclado. */
const MARGIN = 24;

type HostView = ComponentRef<typeof View>;

/** Espacio que hay que dejar abajo de un contenedor cuyo borde inferior (en la ventana) es `bottom`. */
export function keyboardSpace(keyboard: KeyboardMetrics, containerBottom: number) {
  const screen = Dimensions.get('screen').height;
  const win = Dimensions.get('window').height;
  const windowReachesScreenBottom = win >= screen - 1;
  const covered = windowReachesScreenBottom ? screen - keyboard.screenY : keyboard.height;
  return Math.max(0, Math.round(covered - (win - containerBottom)));
}

export function KeyboardAvoider({ children }: { children: ReactNode }) {
  const ref = useRef<HostView>(null);
  const [space, setSpace] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';

    const onShow = async (e: KeyboardEvent) => {
      const view = ref.current;
      if (!view) return;
      const box = await new Promise<{ top: number; bottom: number }>((resolve) =>
        view.measureInWindow((_x, y, _w, h) => resolve({ top: y, bottom: y + h })),
      );
      const next = keyboardSpace(e.endCoordinates, box.bottom);
      if (__DEV__) {
        console.log(
          `[teclado] alto=${Math.round(e.endCoordinates.height)} bordeTeclado=${Math.round(e.endCoordinates.screenY)} ` +
            `contenedor=${Math.round(box.top)}-${Math.round(box.bottom)} ` +
            `pantalla=${Math.round(Dimensions.get('screen').height)} ventana=${Math.round(Dimensions.get('window').height)} -> espacio=${next}`,
        );
      }
      if (ios && e.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
      setSpace(next);
    };
    const onHide = (e: KeyboardEvent) => {
      if (ios && e.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
      setSpace(0);
    };

    // Android vuelve a emitir keyboardDidShow cuando cambia la altura con el teclado abierto.
    const subs = ios
      ? [
          Keyboard.addListener('keyboardWillShow', onShow),
          Keyboard.addListener('keyboardWillChangeFrame', onShow),
          Keyboard.addListener('keyboardWillHide', onHide),
        ]
      : [
          Keyboard.addListener('keyboardDidShow', onShow),
          Keyboard.addListener('keyboardDidHide', onHide),
        ];
    // Si el teclado ya estaba abierto al montar (por ejemplo, al abrir una hoja).
    const metrics = Keyboard.metrics();
    if (Keyboard.isVisible() && metrics) {
      void onShow({ endCoordinates: metrics } as KeyboardEvent);
    }
    return () => subs.forEach((s) => s.remove());
  }, []);

  // El padding no cambia el tamaño exterior del contenedor: la medida siguiente sigue siendo válida.
  return (
    <View ref={ref} collapsable={false} style={{ flex: 1, paddingBottom: space }}>
      {children}
    </View>
  );
}

type FocusScrollViewProps = Omit<ScrollViewProps, 'children'> & {
  children: ReactNode;
  /** Clases del contenido (como contentContainerClassName). */
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export function FocusScrollView({
  children,
  contentClassName,
  contentStyle,
  onLayout,
  onScroll,
  ...props
}: FocusScrollViewProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ComponentRef<typeof View>>(null);
  const height = useRef(0);
  const scrollY = useRef(0);

  const revealFocusedInput = () => {
    // En web (react-native-web) no existe: ahí no hay teclado que esquivar.
    const input = TextInput.State?.currentlyFocusedInput?.();
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(
      content,
      (_x, y, _w, h) => {
        const visible = height.current;
        if (y + h + MARGIN > scrollY.current + visible) {
          scrollRef.current?.scrollTo({ y: y + h + MARGIN - visible, animated: true });
        } else if (y - MARGIN < scrollY.current) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - MARGIN), animated: true });
        }
      },
      () => {},
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...props}
      contentContainerStyle={{ flexGrow: 1 }}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      onLayout={(e) => {
        const prev = height.current;
        height.current = e.nativeEvent.layout.height;
        // Se achicó (apareció el teclado): mostrar el campo que se está escribiendo.
        if (prev > 0 && height.current < prev) revealFocusedInput();
        onLayout?.(e);
      }}>
      <View ref={contentRef} collapsable={false} className={contentClassName} style={contentStyle}>
        {children}
      </View>
    </ScrollView>
  );
}

export function KeyboardScrollView(props: FocusScrollViewProps) {
  return (
    <KeyboardAvoider>
      <FocusScrollView {...props} />
    </KeyboardAvoider>
  );
}
