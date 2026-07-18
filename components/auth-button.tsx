import { auth, signIn } from "@/auth"
import { SECONDARY_BTN, GHOST_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { signOutAction } from "./auth-actions"

async function doSignIn() {
  "use server"
  await signIn("google", { redirectTo: "/" })
}

export async function AuthButton() {
  const session = await auth()

  if (!session?.user) {
    return (
      <form action={doSignIn}>
        <button
          type="submit"
          className={cn(
            "rounded-btn px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-sm hover:shadow transition-all",
            SECONDARY_BTN
          )}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="hidden min-[360px]:inline">Sign in with Google</span>
          <span className="inline min-[360px]:hidden">Sign In</span>
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt={session.user.name ?? ""}
          title={session.user.name ?? session.user.email ?? ""}
          className="h-8 w-8 rounded-full border border-subtle ring-1 ring-accent/20"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-elevated text-xs font-medium text-primary">
          {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
        </div>
      )}
      <div className="hidden flex-col sm:flex">
        <span className="text-xs font-medium text-primary leading-none">
          {session.user.name}
        </span>
        <span className="mt-0.5 text-xs text-muted leading-none">
          {session.user.email}
        </span>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className={cn("text-xs px-2 py-1 rounded", GHOST_BTN)}
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
