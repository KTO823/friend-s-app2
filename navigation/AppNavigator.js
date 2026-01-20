import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ session }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        // === 已登入 (主程式) ===
        <>
          {/* 修正重點：必須用 children 的方式把 session 傳進去，否則 HomeScreen 會壞掉 */}
          <Stack.Screen name="Home">
            {(props) => <HomeScreen {...props} session={session} />}
          </Stack.Screen>
          
          <Stack.Screen name="Profile">
             {(props) => <ProfileScreen {...props} session={session} />}
          </Stack.Screen>
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