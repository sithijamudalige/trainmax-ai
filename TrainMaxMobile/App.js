// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';
// import RootNavigator from './src/navigation/RootNavigator';

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Open up App.js to start working on your app!</Text>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

// import 'react-native-url-polyfill/auto';
// import React from 'react';
// import RootNavigator from './src/navigation/RootNavigator';

import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f0c29' }} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="light" backgroundColor="#0f0c29" />
        <RootNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
