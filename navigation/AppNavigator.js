import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
// ... 其他您原本有的頁面 (如 GroupDetail 等)

const Stack = createNativeStackNavigator();

export default function AppNavigator({ session }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        // === 已登入 (主程式) ===
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          {/* 這裡記得補上您其他的頁面，如 GroupDetail */}
        </>
      ) : (
        // === 未登入 (Auth Flow) ===
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}