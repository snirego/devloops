import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { env } from "next-runtime-env";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FaDiscord,
  FaGithub,
  FaGoogle,
} from "react-icons/fa";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";

type SocialProvider = "google" | "github" | "discord";

interface FormValues {
  name?: string;
  email: string;
  password?: string;
}

interface AuthProps {
  setIsMagicLinkSent: (value: boolean, recipient: string) => void;
  isSignUp?: boolean;
}

const EmailSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().optional(),
});

const availableSocialProviders: Record<
  string,
  { id: string; name: string; icon: React.ComponentType }
> = {
  google: {
    id: "google",
    name: "Google",
    icon: FaGoogle,
  },
  github: {
    id: "github",
    name: "GitHub",
    icon: FaGithub,
  },
  discord: {
    id: "discord",
    name: "Discord",
    icon: FaDiscord,
  },
};

export function Auth({ setIsMagicLinkSent, isSignUp }: AuthProps) {
  const [isCloudEnv, setIsCloudEnv] = useState(false);
  const [isLoginWithProviderPending, setIsLoginWithProviderPending] =
    useState<null | string>(null);
  const [isCredentialsEnabled, setIsCredentialsEnabled] = useState(false);
  const [isEmailSendingEnabled, setIsEmailSendingEnabled] = useState(false);
  const [isLoginWithEmailPending, setIsLoginWithEmailPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { showPopup } = usePopup();
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const redirect = useSearchParams().get("next");
  const callbackURL = redirect ?? "/boards";

  // Safely get environment variables on client side to avoid hydration mismatch
  useEffect(() => {
    const credentialsAllowed =
      env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
    const emailSendingEnabled =
      env("NEXT_PUBLIC_DISABLE_EMAIL")?.toLowerCase() !== "true";
    const isCloud = env("NEXT_PUBLIC_KAN_ENV") === "cloud";
    setIsCloudEnv(isCloud);
    setIsEmailSendingEnabled(emailSendingEnabled);
    setIsCredentialsEnabled(credentialsAllowed);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(EmailSchema),
  });

  // Social providers are configured in Supabase dashboard
  // We show the ones defined in our local config
  const socialProviders = Object.keys(availableSocialProviders);

  const handleLoginWithEmail = async (
    email: string,
    password?: string | null,
    name?: string,
  ) => {
    setIsLoginWithEmailPending(true);
    setLoginError(null);
    const supabase = getSupabaseBrowserClient();

    try {
      if (password) {
        if (isSignUp) {
          // Create the user via our server-side admin API to bypass
          // Supabase's confirmation-email requirement entirely.
          const signUpRes = await fetch("/api/auth/sign-up", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
          });

          const signUpBody = (await signUpRes.json()) as {
            error?: string;
            user?: unknown;
          };

          if (!signUpRes.ok) {
            setLoginError(signUpBody.error ?? t`Sign up failed.`);
          } else {
            // User created & auto-confirmed — sign in immediately
            const { error: signInError } =
              await supabase.auth.signInWithPassword({ email, password });

            if (signInError) {
              setLoginError(signInError.message);
            } else {
              window.location.href = callbackURL;
            }
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            setLoginError(error.message);
          } else {
            window.location.href = callbackURL;
          }
        }
      } else {
        // Magic link login
        if (isCloudEnv || (isEmailSendingEnabled && !isSignUp)) {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}${callbackURL}`,
            },
          });

          if (error) {
            setLoginError(error.message);
          } else {
            setIsMagicLinkSent(true, email);
          }
        } else {
          setLoginError(
            isSignUp
              ? t`Password is required to sign up.`
              : t`Password is required to login.`,
          );
        }
      }
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : t`An unexpected error occurred.`,
      );
    }

    setIsLoginWithEmailPending(false);
  };

  const handleLoginWithProvider = async (provider: SocialProvider) => {
    setIsLoginWithProviderPending(provider);
    setLoginError(null);

    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${callbackURL}`,
      },
    });

    setIsLoginWithProviderPending(null);

    if (error) {
      setLoginError(
        t`Failed to login with ${provider.at(0)?.toUpperCase() + provider.slice(1)}. Please try again.`,
      );
    }
  };

  const onSubmit = async (values: FormValues) => {
    const sanitizedPassword = values.password?.trim()
      ? values.password
      : undefined;
    await handleLoginWithEmail(values.email, sanitizedPassword, values.name);
  };

  const password = watch("password");

  const isMagicLinkAvailable = useMemo(() => {
    return isCloudEnv || (isEmailSendingEnabled && !isSignUp);
  }, [isCloudEnv, isEmailSendingEnabled, isSignUp]);

  const isMagicLinkMode = useMemo(() => {
    if (!isEmailSendingEnabled || isSignUp) return false;
    if (!isCredentialsEnabled) return true;
    return !password;
  }, [isEmailSendingEnabled, isSignUp, isCredentialsEnabled, password]);

  // Auto-focus password field when an error indicates it's required
  useEffect(() => {
    if (!isCredentialsEnabled) return;
    const pwdEmpty = (password ?? "").length === 0;
    let needsPassword = false;
    if (isSignUp && pwdEmpty) {
      needsPassword = true;
    } else if (loginError?.toLowerCase().includes("password")) {
      needsPassword = true;
    } else if (errors.password) {
      needsPassword = true;
    }
    if (needsPassword && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [isSignUp, password, loginError, errors.password, isCredentialsEnabled]);

  return (
    <div className="space-y-6">
      {socialProviders.length !== 0 && (
        <div className="space-y-2">
          {Object.entries(availableSocialProviders).map(([key, provider]) => {
            if (!socialProviders.includes(key)) {
              return null;
            }
            return (
              <Button
                key={key}
                onClick={() =>
                  handleLoginWithProvider(key as SocialProvider)
                }
                isLoading={isLoginWithProviderPending === key}
                iconLeft={<provider.icon />}
                fullWidth
                size="lg"
              >
                <Trans>
                  Continue with {provider.name}
                </Trans>
              </Button>
            );
          })}
        </div>
      )}
      {!(isCredentialsEnabled || isMagicLinkAvailable) &&
        socialProviders.length === 0 && (
          <div className="flex w-full items-center gap-4">
            <div className="h-[1px] w-1/3 bg-light-600 dark:bg-dark-600" />
            <span className="text-center text-sm text-light-900 dark:text-dark-900">
              {t`No authentication methods are currently available`}
            </span>
            <div className="h-[1px] w-1/3 bg-light-600 dark:bg-dark-600" />
          </div>
        )}
      {(isCredentialsEnabled || isMagicLinkAvailable) && (
        <form onSubmit={handleSubmit(onSubmit)}>
          {socialProviders.length !== 0 && (
            <div className="mb-[1.5rem] flex w-full items-center gap-4">
              <div className="h-[1px] w-full bg-light-600 dark:bg-dark-600" />
              <span className="text-sm text-light-900 dark:text-dark-900">
                {t`or`}
              </span>
              <div className="h-[1px] w-full bg-light-600 dark:bg-dark-600" />
            </div>
          )}
          <div className="space-y-2">
            {isSignUp && isCredentialsEnabled && (
              <div>
                <Input
                  {...register("name", { required: true })}
                  placeholder={t`Enter your name`}
                />
                {errors.name && (
                  <p className="mt-2 text-xs text-red-400">
                    {t`Please enter a valid name`}
                  </p>
                )}
              </div>
            )}
            <div>
              <Input
                {...register("email", { required: true })}
                placeholder={t`Enter your email address`}
              />
              {errors.email && (
                <p className="mt-2 text-xs text-red-400">
                  {t`Please enter a valid email address`}
                </p>
              )}
            </div>

            {isCredentialsEnabled && (
              <div>
                <Input
                  type="password"
                  {...register("password", { required: true })}
                  placeholder={t`Enter your password`}
                />
                {errors.password && (
                  <p className="mt-2 text-xs text-red-400">
                    {errors.password.message ??
                      t`Please enter a valid password`}
                  </p>
                )}
              </div>
            )}
            {loginError && (
              <p className="mt-2 text-xs text-red-400">{loginError}</p>
            )}
          </div>
          <div className="mt-[1.5rem] flex items-center gap-4">
            <Button
              isLoading={isLoginWithEmailPending}
              fullWidth
              size="lg"
              variant="secondary"
            >
              {isSignUp ? t`Sign up with ` : t`Continue with `}
              {isMagicLinkMode ? t`magic link` : t`email`}
            </Button>
          </div>
        </form>
      )}
      {!(isCredentialsEnabled || isMagicLinkAvailable) && loginError && (
        <p className="mt-2 text-xs text-red-400">{loginError}</p>
      )}
    </div>
  );
}
