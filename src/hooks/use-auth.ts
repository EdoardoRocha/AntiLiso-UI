'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AUTH_ME_QUERY_KEY, RESERVE_QUERY_KEY, SAFE_TO_SPEND_QUERY_KEY } from '@/lib/query-keys';
import {
  disableTwoFactor,
  enableTwoFactor,
  fetchMe,
  login,
  logout,
  register,
  setupTwoFactor,
  updateMe,
} from '@/lib/api';

export { AUTH_ME_QUERY_KEY };

export function useMe() {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMe,
    onSuccess: async (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
      ]);
    },
  });
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: setupTwoFactor,
  });
}

export function useEnableTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enableTwoFactor,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
    },
  });
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableTwoFactor,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
    },
  });
}
