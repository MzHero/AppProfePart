// Habilita className en componentes de terceros que NativeWind no conoce.
// Sin esto, `className` / `contentContainerClassName` se ignoran en silencio.
import { cssInterop } from 'nativewind';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

cssInterop(KeyboardAwareScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
