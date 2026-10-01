"use client";

import {
  Activity, ArrowLeft, Bookmark, Camera, Check, ChevronDown, CircleHelp, Compass, Flame, Gamepad2, Pencil,
  Heart, Home, ImagePlus, Laugh, LogOut, MessageCircle, MoreHorizontal, Music2, Plus,
  Search, Send, Settings2, ShieldCheck, Smile, Sparkles, UserRound, Users, Wind, X,
  Bell, Play, Pause, Volume2, VolumeX, Share2, Upload, Clock3, LockKeyhole, Mail, Trash2, Video, CircleStop, RotateCcw,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Comment = { name: string; text: string };
type CommunityPreview = { id: string; name: string; description: string };
type Post = {
  id: string; username: string; avatar: string; location: string; image: string; caption: string;
  likes: number; comments: Comment[]; liked: boolean; saved: boolean; time: string; kind?: "video";
};
 type Story = { id: string; username: string; avatar: string; image: string; createdAt: number; own?: boolean; kind?: "video" };
type Section = "Home" | "Explore" | "Reels" | "Comedy zone" | "Messages" | "Games" | "Take a breath" | "Tribe" | "Notifications" | "Profile" | "Saved";
type Modal = "post" | "story" | "camera" | "auth" | "comment" | "game" | "edit" | "edit-post" | "community" | null;
type CameraTarget = "post" | "story";

const photo = (id: string, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const avatars = [
  photo("photo-1534528741775-53994a69daeb", 120), photo("photo-1500648767791-00dcc994a43e", 120),
  photo("photo-1531123897727-8f129e1688ce", 120), photo("photo-1506794778202-cad84cf45f1d", 120),
  photo("photo-1524504388940-b1c1722653e1", 120), photo("photo-1535713875002-d1d0cf377fde", 120),
  photo("photo-1529139574466-a303027c1d8b", 120),
];
const initialPosts: Post[] = [
  { id: "p1", username: "mila.moon", avatar: avatars[0], location: "Joshua Tree, CA", image: photo("photo-1470252649378-9c29740c9fa8"), caption: "Somewhere between overthinking and touching grass 🌿 this won.", likes: 1248, comments: [{ name: "nina", text: "the light is unreal ✨" }, { name: "jules", text: "adding this to my happy places" }], liked: false, saved: false, time: "18 min ago" },
  { id: "p2", username: "theweekendclub", avatar: avatars[2], location: "Brooklyn, New York", image: photo("photo-1528605248644-14dd04022da1"), caption: "POV: the group chat actually made it out of the group chat 🥂 @lex.you were right about the pasta.", likes: 867, comments: [{ name: "lex.you", text: "I am always right about pasta" }], liked: true, saved: false, time: "1 hr ago" },
  { id: "p3", username: "kai.afterhours", avatar: avatars[3], location: "Somewhere quiet", image: photo("photo-1470770841072-f978cf4d019e"), caption: "Reminder that doing nothing is also doing something. take the long way home today ☁️", likes: 2194, comments: [{ name: "softfocus", text: "needed this today, thank you" }], liked: false, saved: true, time: "3 hr ago" },
];
const initialStories: Story[] = [
  { id: "s1", username: "mila.moon", avatar: avatars[0], image: photo("photo-1470252649378-9c29740c9fa8"), createdAt: Date.now() - 60000 },
  { id: "s2", username: "nina.jpg", avatar: avatars[4], image: photo("photo-1511988617509-a57c8a288659"), createdAt: Date.now() - 180000 },
  { id: "s3", username: "lex.you", avatar: avatars[1], image: photo("photo-1518837695005-2083093ee35b"), createdAt: Date.now() - 360000 },
  { id: "s4", username: "kai.afterhours", avatar: avatars[3], image: photo("photo-1470770841072-f978cf4d019e"), createdAt: Date.now() - 540000 },
  { id: "s5", username: "theweekendclub", avatar: avatars[2], image: photo("photo-1528605248644-14dd04022da1"), createdAt: Date.now() - 900000 },
];
const nav: { label: Section; icon: typeof Home }[] = [
  { label: "Home", icon: Home }, { label: "Explore", icon: Compass }, { label: "Reels", icon: Play },
  { label: "Comedy zone", icon: Laugh }, { label: "Messages", icon: MessageCircle }, { label: "Games", icon: Gamepad2 },
  { label: "Take a breath", icon: Wind }, { label: "Tribe", icon: Users }, { label: "Notifications", icon: Bell },
  { label: "Profile", icon: UserRound },
];
const people = [
  { name: "nina.jpg", note: "In your circle", avatar: avatars[4] },
  { name: "lex.you", note: "Followed by mila.moon", avatar: avatars[1] },
  { name: "softfocus", note: "Suggested for you", avatar: avatars[5] },
];
const jokes = [
  "My bed and I are perfect for each other, but my alarm keeps trying to break us up.",
  "I told my therapist I have a fear of commitment. She said we should talk about it. I said maybe next week.",
  "Me: I should save money. Also me: this little treat is part of my healing journey.",
];
const gamePrompts = [
  { title: "Would you rather…", prompt: "Have a personal theme song that plays every time you enter a room, or have to narrate your day like a nature documentary?", choices: ["🎺 Theme song entrance", "🎙️ David Attenborough voice"] },
  { title: "Truth or dare", prompt: "Pick your vibe. No pressure, only good energy.", choices: ["💭 Truth: what tiny thing makes you irrationally happy?", "✨ Dare: send a kind message to someone"] },
  { title: "Never have I ever", prompt: "Never have I ever pretended to understand a meme and laughed anyway.", choices: ["🥂 Guilty", "😇 Never"] },
  { title: "Emoji decode", prompt: "What movie are these emojis hinting at? 🦁👑", choices: ["The Lion King", "Madagascar"] },
];
const savedValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};

export default function HomePage() {
  const [section, setSection] = useState<Section>("Home");
  const [modal, setModal] = useState<Modal>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [following, setFollowing] = useState<string[]>(["mila.moon"]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset">("login");
  const [sessionUser, setSessionUser] = useState<{ id?: string; email?: string; username: string; avatar: string } | null>(null);
  const [profileName, setProfileName] = useState("you.do.you");
  const [profileBio, setProfileBio] = useState("collecting little moments ✨\nmore fun, less stress.");
  const [profileAvatar, setProfileAvatar] = useState(avatars[6]);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [createdCommunities, setCreatedCommunities] = useState<CommunityPreview[]>(() => savedValue("vwt-created-communities", []));
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const authBusy = useRef(false);
  const hadAuthSession = useRef(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editPostCaption, setEditPostCaption] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>("post");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [gameIndex, setGameIndex] = useState(0);
  const [gameChoice, setGameChoice] = useState("");
  const [gameScore, setGameScore] = useState(() => savedValue("vwt-game-score", 0));
  const [mood, setMood] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [chatName, setChatName] = useState("nina.jpg");
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string[]>>({ "nina.jpg": ["ok but that sunset you posted?? 🥹", "we need a no-plans weekend soon"], "lex.you": ["you free for coffee tomorrow? ☕"], "softfocus": ["sent you that playlist!"] });
  const [chatText, setChatText] = useState("");
  const [notifications, setNotifications] = useState(true);
  const feedQuery = useQuery(api.social.getFeed, { userId: sessionUser?.id ?? "", limit: 20 });
  const storiesQuery = useQuery(api.social.listStories, {});
  const profileQuery = useQuery(api.social.getProfile, { userId: sessionUser?.id ?? "" });
  const upsertProfileMutation = useMutation(api.social.upsertProfile);
  const createPostMutation = useMutation(api.social.createPost);
  const toggleLikeMutation = useMutation(api.social.toggleLike);
  const addCommentMutation = useMutation(api.social.addComment);
  const toggleFollowMutation = useMutation(api.social.toggleFollow);
  const createStoryMutation = useMutation(api.social.createStory);
  const createCommunityMutation = useMutation(api.social.createCommunity);
  const sendMessageMutation = useMutation(api.social.sendMessage);
  const fileInput = useRef<HTMLInputElement>(null);
  const storyInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const storyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPosts(savedValue("vwt-posts", initialPosts));
    setStories(savedValue<Story[]>("vwt-stories", initialStories).filter((story) => Date.now() - story.createdAt < 86400000));
    setFollowing(savedValue("vwt-following", ["mila.moon"]));
    setProfileName(savedValue("vwt-profile-name", "you.do.you"));
    setProfileBio(savedValue("vwt-profile-bio", "collecting little moments ✨\nmore fun, less stress."));
    setProfileAvatar(savedValue("vwt-profile-avatar", avatars[6]));
    setPrivateAccount(savedValue("vwt-profile-private", false));
    setMessages(savedValue("vwt-messages", { "nina.jpg": ["ok but that sunset you posted?? 🥹", "we need a no-plans weekend soon"], "lex.you": ["you free for coffee tomorrow? ☕"], "softfocus": ["sent you that playlist!"] }));
    setMood(savedValue("vwt-mood", ""));
    const demo = savedValue<{ username: string; avatar: string } | null>("vwt-demo-user", null);
    if (demo) setSessionUser(demo);
    const client = supabase;
    if (client) {
      let mounted = true;
      const applySession = (session: Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"]) => {
        if (!mounted) return;
        const user = session?.user;
        if (!user) {
          const justSignedOut = hadAuthSession.current;
          hadAuthSession.current = false;
          setSessionUser((current) => current?.id ? null : current);
          if (justSignedOut) {
            setProfileName("you.do.you");
            setProfileBio("collecting little moments ✨\nmore fun, less stress.");
            setProfileAvatar(avatars[6]);
            setPrivateAccount(false);
          }
          return;
        }
        hadAuthSession.current = true;
        const username = String(user.user_metadata?.username ?? user.email?.split("@")[0] ?? "friend");
        const avatar = String(user.user_metadata?.avatar_url ?? avatars[6]);
        setSessionUser({ id: user.id, email: user.email, username, avatar });
      };
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => applySession(session));
      void client.auth.getSession().then(({ data, error }) => {
        if (error) notify(`Could not restore your session: ${error.message}`);
        applySession(data.session);
      }).catch(() => notify("Could not restore your session. Please refresh and try again."));
      return () => { mounted = false; subscription.unsubscribe(); };
    }
  }, []);

  useEffect(() => {
    if (!supabase || !sessionUser?.id) return;
    let mounted = true;
    void (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("username,bio,is_private,avatar_url").eq("id", sessionUser.id).maybeSingle();
        if (!mounted) return;
        if (error) { notify(`Profile details could not be loaded: ${error.message}`); return; }
        if (!data) return;
        setProfileBio(data.bio);
        setPrivateAccount(data.is_private);
        if (data.avatar_url) setProfileAvatar(data.avatar_url);
        if (data.username && data.username !== sessionUser.username) {
          setSessionUser({ ...sessionUser, username: data.username });
        }
      } catch {
        if (mounted) notify("Profile details could not be loaded. Please try again later.");
      }
    })();
    return () => { mounted = false; };
  }, [sessionUser?.id]);

  useEffect(() => {
    const client = supabase;
    if (!client || !sessionUser?.id) { setChatConversationId(null); return; }
    let cancelled = false;
    let realtimeChannel: ReturnType<NonNullable<typeof supabase>['channel']> | undefined;
    const connectChat = async () => {
      const { data: partner } = await client.from("profiles").select("id").eq("username", chatName).maybeSingle();
      if (cancelled || !partner) { setChatConversationId(null); return; }
      const { data: conversationId, error: conversationError } = await client.rpc("start_direct_conversation", { other_user: partner.id });
      if (conversationError || !conversationId) { if (!cancelled) notify(`Could not open this conversation: ${conversationError?.message ?? "Unknown error"}`); return; }
      if (cancelled) return;
      setChatConversationId(conversationId);
      const { data: rows } = await client.from("messages").select("body,sender_id").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (!cancelled && rows) setMessages((all) => ({ ...all, [chatName]: rows.map((row) => row.sender_id === sessionUser.id ? `__mine__:${row.body}` : row.body) }));
      realtimeChannel = client.channel(`messages:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const incoming = payload.new as { body?: string; sender_id?: string };
        if (!incoming.body || incoming.sender_id === sessionUser.id) return;
        setMessages((all) => ({ ...all, [chatName]: [...(all[chatName] ?? []), incoming.body!] }));
      }).subscribe();
    };
    void connectChat();
    return () => { cancelled = true; if (realtimeChannel) void client.removeChannel(realtimeChannel); };
  }, [chatName, sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id) return;
    void upsertProfileMutation({
      userId: sessionUser.id,
      username: sessionUser.username,
      avatarUrl: sessionUser.avatar,
      fullName: sessionUser.username,
      bio: profileBio,
      isPrivate: privateAccount,
      email: sessionUser.email,
    });
  }, [sessionUser?.id, sessionUser?.username, sessionUser?.avatar, sessionUser?.email, profileBio, privateAccount, upsertProfileMutation]);

  useEffect(() => {
    if (!feedQuery) return;
    const normalized: Post[] = feedQuery.map((entry) => ({
      id: String(entry.id ?? entry._id),
      username: entry.username,
      avatar: entry.avatarUrl ?? avatars[6],
      location: entry.location ?? "Your tribe",
      image: entry.mediaUrl,
      caption: entry.caption,
      likes: entry.likesCount ?? 0,
      comments: (entry.comments ?? []).map((comment: { username: string; body: string }) => ({ name: comment.username, text: comment.body })),
      liked: Boolean(entry.isLiked),
      saved: false,
      time: new Date(entry.createdAt ?? entry._creationTime).toLocaleDateString(),
      kind: entry.mediaType === "video" ? "video" : undefined,
    }));
    if (normalized.length) setPosts(normalized);
  }, [feedQuery]);

  useEffect(() => {
    if (!storiesQuery) return;
    const normalized: Story[] = storiesQuery.map((entry) => ({
      id: String(entry.id ?? entry._id),
      username: entry.username,
      avatar: entry.avatarUrl ?? avatars[6],
      image: entry.mediaUrl,
      createdAt: Number(entry.createdAt ?? entry._creationTime),
      own: entry.userId === sessionUser?.id,
      kind: entry.mediaType === "video" ? "video" : undefined,
    }));
    setStories(normalized);
  }, [storiesQuery, sessionUser?.id]);

  useEffect(() => { try { localStorage.setItem("vwt-posts", JSON.stringify(posts)); } catch { /* Storage can fill up with local media. */ } }, [posts]);
  useEffect(() => { try { localStorage.setItem("vwt-stories", JSON.stringify(stories)); } catch { /* Uploaded media may exceed browser storage. */ } }, [stories]);
  useEffect(() => { localStorage.setItem("vwt-following", JSON.stringify(following)); }, [following]);
  useEffect(() => { localStorage.setItem("vwt-messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("vwt-mood", JSON.stringify(mood)); }, [mood]);
  useEffect(() => { localStorage.setItem("vwt-game-score", JSON.stringify(gameScore)); }, [gameScore]);
  useEffect(() => { try { localStorage.setItem("vwt-created-communities", JSON.stringify(createdCommunities)); } catch { notify("Your new community is available for this session but could not be saved on this device."); } }, [createdCommunities]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2900);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => () => { if (mediaPreview.startsWith("blob:")) URL.revokeObjectURL(mediaPreview); }, [mediaPreview]);
  useEffect(() => () => { if (storyTimer.current) clearTimeout(storyTimer.current); }, []);

  const notify = (message: string) => setToast(message);
  const currentName = sessionUser?.username ?? profileName;
  const currentAvatar = sessionUser?.avatar ?? profileAvatar;
  const postDraftKey = `vwt-post-draft:${sessionUser?.id ?? `demo-${currentName}`}`;
  const upload = async (file: File, bucket: string, ownerId = sessionUser?.id) => {
    if (supabase && ownerId) {
      const path = `${ownerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (!error && bucket === "stories") {
        const { data, error: signedUrlError } = await supabase.storage.from(bucket).createSignedUrl(path, 86400);
        if (data?.signedUrl) return data.signedUrl;
        notify(`Story link could not be created: ${signedUrlError?.message ?? "Unknown error"}`);
        return "";
      }
      if (!error) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      notify(`Cloud upload failed: ${error.message}`);
      return "";
    }
    if (file.size < 1200000) return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read this file.")); reader.readAsDataURL(file);
    });
    return URL.createObjectURL(file);
  };
  const createPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!newCaption.trim() && !mediaFile) { notify("Add a caption or choose a photo first."); return; }
    if (isSubmittingPost) return;
    setIsSubmittingPost(true);
    try {
      let media = mediaPreview || photo("photo-1524504388940-b1c1722653e1");
      if (mediaFile) {
        setIsUploading(true);
        try {
        media = await upload(mediaFile, "posts");
        } finally {
          setIsUploading(false);
        }
      }
      if (!media) throw new Error("Media upload did not return a usable file.");
      let postId = `local-${Date.now()}`;
      if (sessionUser?.id) {
        const created = await createPostMutation({
          userId: sessionUser.id,
          username: currentName,
          avatarUrl: currentAvatar,
          location: "Your corner of the internet",
          caption: newCaption.trim(),
          mediaUrl: media,
          mediaType: mediaFile?.type.startsWith("video/") ? "video" : "image",
        });
        if (!created) throw new Error("The post could not be saved.");
        postId = String(created.id ?? created._id);
      }
      const post: Post = { id: postId, username: currentName, avatar: currentAvatar, location: "Your corner of the internet", image: media, caption: newCaption.trim(), likes: 0, comments: [], liked: false, saved: false, time: "just now", kind: mediaFile?.type.startsWith("video/") ? "video" : undefined };
      setPosts((items) => [post, ...items]);
      localStorage.removeItem(postDraftKey);
      setNewCaption(""); setMediaFile(null); setMediaPreview(""); setModal(null);
      notify(sessionUser?.id ? "Post shared with your tribe." : "Posted in this browser. Connect Supabase to share across devices.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "The post could not be shared. Please try again.");
    } finally {
      setIsUploading(false);
      setIsSubmittingPost(false);
    }
  };
  const savePostDraft = () => {
    if (!newCaption.trim()) { notify("Add a caption before saving a draft."); return; }
    try {
      localStorage.setItem(postDraftKey, JSON.stringify({ caption: newCaption.trim(), savedAt: Date.now() }));
      notify("Caption draft saved on this device. Media files aren’t included.");
    } catch {
      notify("This draft could not be saved on the device.");
    }
  };
  const restorePostDraft = () => {
    const draft = savedValue<{ caption: string } | null>(postDraftKey, null);
    if (!draft) { notify("No saved caption draft for this profile."); return; }
    setNewCaption(draft.caption);
    setMediaFile(null); setMediaPreview("");
    notify("Draft restored. Choose your photo or video again.");
  };
  const canManageLocalPost = (post: Post) => post.id.startsWith("local-") && post.username === currentName;
  const openEditLocalPost = (post: Post) => {
    if (!canManageLocalPost(post)) return;
    setEditingPost(post);
    setEditPostCaption(post.caption);
    setModal("edit-post");
  };
  const saveLocalPostEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPost || !canManageLocalPost(editingPost)) return;
    setPosts((items) => items.map((post) => post.id === editingPost.id ? { ...post, caption: editPostCaption.trim() } : post));
    setModal(null);
    setEditingPost(null);
    notify("Preview post updated on this device.");
  };
  const deleteLocalPost = (post: Post) => {
    if (!canManageLocalPost(post)) return;
    if (!window.confirm("Delete this post from this device?")) return;
    setPosts((items) => items.filter((item) => item.id !== post.id));
    if (selectedPost === post.id) { setSelectedPost(null); setModal(null); }
    notify("Preview post deleted from this device.");
  };
  const toggleLike = async (post: Post) => {
    const nextLiked = !post.liked;
    if (sessionUser?.id && !post.id.startsWith("local-")) {
      try {
        await toggleLikeMutation({ postId: post.id as any, userId: sessionUser.id });
      } catch {
        notify("Your reaction wasn’t saved. Please try again.");
        return;
      }
    }
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, liked: nextLiked, likes: Math.max(0, item.likes + (nextLiked ? 1 : -1)) } : item));
  };
  const toggleSave = (id: string) => setPosts((items) => items.map((item) => item.id === id ? { ...item, saved: !item.saved } : item));
  const toggleFollow = async (username: string) => {
    const currentlyFollowing = following.includes(username);
    if (sessionUser?.id) {
      try {
        const result = await toggleFollowMutation({ followerId: sessionUser.id, followingUsername: username });
        if (!result?.followed && !currentlyFollowing) {
          notify(`${username} is preview content, not a registered account yet.`);
        }
      } catch {
        notify(`Your follow for ${username} wasn’t saved. Please try again.`);
        return;
      }
    }
    setFollowing((items) => currentlyFollowing ? items.filter((name) => name !== username) : [...items, username]);
    notify(currentlyFollowing ? `Unfollowed ${username}` : `You're following ${username}`);
  };
  const updatePrivacy = async (isPrivate: boolean) => {
    const previousValue = privateAccount;
    setPrivateAccount(isPrivate);
    if (supabase && sessionUser?.id) {
      try {
        const { error } = await supabase.from("profiles").update({ is_private: isPrivate }).eq("id", sessionUser.id);
        if (error) throw error;
      } catch (error) {
        setPrivateAccount(previousValue);
        notify(`Privacy wasn’t updated: ${error instanceof Error ? error.message : "check your connection and try again"}`);
        return;
      }
    }
    localStorage.setItem("vwt-profile-private", JSON.stringify(isPrivate));
    notify(isPrivate ? "Your profile is private." : "Your profile is public.");
  };
  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim().replace(/^@/, "");
    const bio = String(form.get("bio") ?? "").trim();
    if (!/^[a-zA-Z0-9._]{3,24}$/.test(name)) { notify("Username must be 3–24 letters, numbers, dots, or underscores."); return; }
    if (supabase && sessionUser?.id) {
      try {
        const { error } = await supabase.from("profiles").update({ username: name, bio }).eq("id", sessionUser.id);
        if (error) { notify(`Profile wasn’t updated: ${error.message}`); return; }
        const { error: authError } = await supabase.auth.updateUser({ data: { username: name } });
        if (authError) notify(`Profile saved, but auth metadata did not update: ${authError.message}`);
      } catch {
        notify("Profile wasn’t updated. Check your connection and try again.");
        return;
      }
    }
    setProfileName(name); setProfileBio(bio);
    localStorage.setItem("vwt-profile-name", JSON.stringify(name)); localStorage.setItem("vwt-profile-bio", JSON.stringify(bio));
    if (sessionUser) {
      const updated = { ...sessionUser, username: name }; setSessionUser(updated);
      if (!sessionUser.id) localStorage.setItem("vwt-demo-user", JSON.stringify(updated));
    }
    setPosts((items) => items.map((post) => post.username === currentName ? { ...post, username: name } : post));
    setModal(null); notify("Profile updated.");
  };
  const openStory = (story: Story) => {
    setSelectedStory(story);
    if (storyTimer.current) clearTimeout(storyTimer.current);
    storyTimer.current = setTimeout(() => setSelectedStory(null), 7500);
  };
  const deleteLocalStory = (story: Story) => {
    if (!story.own || sessionUser?.id || !story.id.startsWith("story-")) return;
    if (!window.confirm("Delete this story from this device?")) return;
    setStories((items) => items.filter((item) => item.id !== story.id));
    setSelectedStory(null);
    notify("Story deleted from this device.");
  };
  const handleFile = async (file: File | undefined, type: "post" | "story") => {
    if (!file) return;
    const max = file.type.startsWith("video/") ? 25000000 : 10000000;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) { notify("Choose an image or video file."); return; }
    if (file.size > max) { notify("That file is too large. Images up to 10 MB and videos up to 25 MB are supported."); return; }
    if (type === "post") { setMediaFile(file); setMediaPreview(URL.createObjectURL(file)); }
    else {
      setIsUploading(true);
      try {
        const image = await upload(file, "stories");
        if (!image) return;
        if (sessionUser?.id) {
          const created = await createStoryMutation({ userId: sessionUser.id, username: currentName, avatarUrl: currentAvatar, mediaUrl: image, mediaType: file.type.startsWith("video/") ? "video" : "image" });
          if (!created) { notify("Story wasn’t shared."); return; }
        }
        const story = { id: `story-${Date.now()}`, username: currentName, avatar: currentAvatar, image, createdAt: Date.now(), own: true, kind: file.type.startsWith("video/") ? "video" as const : undefined };
        setStories((items) => [story, ...items]); setModal(null); openStory(story);
        notify(sessionUser?.id ? "Story shared. It disappears in 24 hours." : "Story added here for 24 hours. Connect Supabase for cloud sharing.");
      } catch {
        notify("The story could not be uploaded. Check your connection and try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };
  const openCamera = (target: CameraTarget) => { setCameraTarget(target); setModal("camera"); };
  const handleCameraCapture = (file: File) => {
    if (cameraTarget === "post") {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setModal("post");
      return;
    }
    setModal("story");
    void handleFile(file, "story");
  };
  const updateAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5000000) { notify("Choose an image smaller than 5 MB."); return; }
    if (supabase && !sessionUser?.id) { notify("Create an account before uploading a cloud profile photo."); return; }
    setIsUploading(true);
    try {
      const avatar = await upload(file, "avatars");
      if (!avatar) return;
      if (supabase && sessionUser?.id) {
        const { error } = await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", sessionUser.id);
        if (error) { notify(`Photo wasn’t saved: ${error.message}`); return; }
        setSessionUser({ ...sessionUser, avatar });
      } else if (sessionUser) {
        const next = { ...sessionUser, avatar }; setSessionUser(next); localStorage.setItem("vwt-demo-user", JSON.stringify(next));
      }
      setProfileAvatar(avatar); localStorage.setItem("vwt-profile-avatar", JSON.stringify(avatar));
      notify("Profile photo updated.");
    } catch {
      notify("The profile photo could not be uploaded. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };
  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPost || !commentText.trim()) return;
    const text = commentText.trim();
    if (sessionUser?.id && !selectedPost.startsWith("local-")) {
      try {
        const created = await addCommentMutation({ postId: selectedPost as any, userId: sessionUser.id, username: currentName, avatarUrl: currentAvatar, body: text });
        if (!created) { notify("Comment wasn’t saved."); return; }
      } catch {
        notify("Comment wasn’t saved. Check your connection and try again.");
        return;
      }
    }
    setPosts((items) => items.map((post) => post.id === selectedPost ? { ...post, comments: [...post.comments, { name: currentName, text }] } : post));
    setCommentText(""); setModal(null); notify("Comment added.");
  };
  const submitCommunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingCommunity) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (name.length < 2 || !description) { notify("Add a community name and description first."); return; }
    setIsCreatingCommunity(true);
    try {
      let communityId = `local-${Date.now()}`;
      if (sessionUser?.id) {
        const created = await createCommunityMutation({ ownerId: sessionUser.id, name, description, isPrivate: form.get("private") === "on" });
        if (!created) throw new Error("The community could not be created.");
        communityId = String(created.id);
      }
      setCreatedCommunities((items) => [{ id: communityId, name, description }, ...items]);
      setModal(null);
      notify(sessionUser?.id ? `Community “${name}” created.` : "Community created in this browser.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create the community. Please try again.");
    } finally {
      setIsCreatingCommunity(false);
    }
  };
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    const text = chatText.trim();
    if (supabase && sessionUser?.id && !chatConversationId) { notify(`${chatName} needs a Vibe With Tribe account before cloud messaging can start.`); return; }
    const optimisticMessage = `__mine__:${text}`;
    setMessages((all) => ({ ...all, [chatName]: [...(all[chatName] ?? []), optimisticMessage] }));
    if (supabase && sessionUser?.id && chatConversationId) {
      try {
        const { error } = await supabase.from("messages").insert({ conversation_id: chatConversationId, sender_id: sessionUser.id, body: text });
        if (error) {
          setMessages((all) => {
            const conversation = [...(all[chatName] ?? [])];
            const optimisticIndex = conversation.lastIndexOf(optimisticMessage);
            if (optimisticIndex !== -1) conversation.splice(optimisticIndex, 1);
            return { ...all, [chatName]: conversation };
          });
          notify(`Message wasn’t delivered: ${error.message}`);
          return;
        }
      } catch {
        setMessages((all) => {
          const conversation = [...(all[chatName] ?? [])];
          const optimisticIndex = conversation.lastIndexOf(optimisticMessage);
          if (optimisticIndex !== -1) conversation.splice(optimisticIndex, 1);
          return { ...all, [chatName]: conversation };
        });
        notify("Message wasn’t delivered. Check your connection and try again.");
        return;
      }
    } else notify("Message saved in this browser only.");
    setChatText("");
  };
  const publishAuth = async (event: FormEvent<HTMLFormElement>) => {
    if (authBusy.current) return;
    event.preventDefault(); setAuthError(""); setAuthMessage("");
    authBusy.current = true;
    try {
      const data = new FormData(event.currentTarget);
      const email = String(data.get("email") ?? "").trim(); const password = String(data.get("password") ?? "");
      const username = String(data.get("username") ?? "").trim().replace(/^@/, "");
      const avatarFile = data.get("avatar") instanceof File && (data.get("avatar") as File).size ? data.get("avatar") as File : null;
      if (authMode === "reset") {
        if (!email.includes("@")) { setAuthError("Enter a valid email address."); return; }
        if (!supabase) { setAuthError("Password reset needs Supabase. Add your project keys to .env.local."); return; }
        setAuthMessage("Sending password reset link...");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) { setAuthMessage(""); setAuthError(error.message); } else setAuthMessage("Password reset link sent. Check your inbox.");
        return;
      }
      if (password.length < 8) { setAuthError("Use a password with at least 8 characters."); return; }
      if (authMode === "signup" && !/^[a-zA-Z0-9._]{3,24}$/.test(username)) { setAuthError("Username must be 3–24 letters, numbers, dots, or underscores."); return; }
      setAuthMessage(authMode === "signup" ? "Creating your account..." : "Signing you in...");
      if (!supabase) {
        const demo = { username: authMode === "signup" ? username : email.split("@")[0], avatar: authMode === "signup" && avatarFile ? await upload(avatarFile, "avatars") : currentAvatar };
        localStorage.setItem("vwt-demo-user", JSON.stringify(demo)); localStorage.setItem("vwt-profile-avatar", JSON.stringify(demo.avatar)); setSessionUser(demo); setProfileName(demo.username); setModal(null);
        notify("Demo profile ready on this device. Add Supabase for secure accounts."); return;
      }
      const result = authMode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) { setAuthMessage(""); setAuthError(result.error.message); return; }
      if (result.data.user && result.data.session) {
        let avatar = currentAvatar;
        if (authMode === "signup" && avatarFile) {
          avatar = await upload(avatarFile, "avatars", result.data.user.id);
          const { error: profileError } = await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", result.data.user.id);
          if (profileError) notify(`Account created, but the profile photo was not saved: ${profileError.message}`);
        }
        const nextUser = { id: result.data.user.id, email, username: authMode === "signup" ? username : String(result.data.user.user_metadata?.username ?? email.split("@")[0]), avatar };
        setSessionUser(nextUser); setProfileName(nextUser.username); localStorage.removeItem("vwt-demo-user"); setModal(null); notify("Welcome to your tribe.");
      } else setAuthMessage("Check your email to confirm your account, then come back to sign in.");
    } catch (error) {
      setAuthMessage("");
      setAuthError(error instanceof Error ? error.message : "Authentication failed. Check your connection and try again.");
    } finally {
      authBusy.current = false;
    }
  };
  const googleLogin = async () => {
    if (!supabase) { setAuthError("Google sign-in needs Supabase credentials and a configured Google provider."); return; }
    if (authBusy.current) return;
    authBusy.current = true;
    setAuthError("");
    setAuthMessage("Opening Google sign-in...");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) { setAuthMessage(""); setAuthError(error.message); }
    } catch (error) {
      setAuthMessage("");
      setAuthError(error instanceof Error ? error.message : "Google sign-in could not start. Please try again.");
    } finally {
      authBusy.current = false;
    }
  };
  const signOut = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) { notify(`Could not sign out: ${error.message}`); return; }
      }
      localStorage.removeItem("vwt-demo-user");
      localStorage.removeItem("vwt-profile-name");
      localStorage.removeItem("vwt-profile-bio");
      localStorage.removeItem("vwt-profile-avatar");
      localStorage.removeItem("vwt-profile-private");
      setSessionUser(null); setProfileName("you.do.you"); setProfileBio("collecting little moments ✨\nmore fun, less stress."); setProfileAvatar(avatars[6]); setPrivateAccount(false);
      notify("Signed out.");
    } catch {
      notify("Could not sign out. Check your connection and try again.");
    }
  };
  const sharePost = async (post: Post) => {
    try {
      if (navigator.share) await navigator.share({ title: `A little vibe from @${post.username}`, text: post.caption, url: window.location.href });
      else { await navigator.clipboard.writeText(`${post.caption} — VIBE WITH TRIBE`); notify("Caption copied to clipboard."); }
    } catch { /* Share sheet closed. */ }
  };
  const setPage = (page: Section) => { setSection(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const visiblePosts = posts.filter((post) => section === "Saved" ? post.saved : section === "Comedy zone" ? /meme|lol|funny|joke|😂|🤣/i.test(post.caption + post.username) : true)
    .filter((post) => !search || `${post.username} ${post.caption} ${post.location}`.toLowerCase().includes(search.toLowerCase()));
  const showAuth = (mode: "login" | "signup" | "reset" = "login") => { setAuthMode(mode); setAuthError(""); setAuthMessage(""); setModal("auth"); };
  const setMedia = (file: File | undefined) => { if (file) void handleFile(file, "post"); };

  if (modal === "auth") return <AuthPage mode={authMode} setMode={setAuthMode} onSubmit={publishAuth} onGoogle={googleLogin} error={authError} message={authMessage} onClose={() => setModal(null)} />;

  return (
    <div className="app-shell">
      {section === "Home" && <FloatingHearts />}
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div className="brand-copy"><div className="brand-name">VIBE WITH TRIBE</div><div className="brand-tag">More fun. Less stress.</div></div></div>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map(({ label, icon: Icon }) => <button key={label} aria-label={label} className={`nav-item ${section === label ? "active" : ""}`} onClick={() => setPage(label)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>)}
          <button aria-label="Saved" className={`nav-item ${section === "Saved" ? "active" : ""}`} onClick={() => setPage("Saved")}><Bookmark size={18} strokeWidth={1.8} /><span>Saved</span></button>
        </nav>
        <div className="nav-spacer" />
        <div className="side-card"><p>Your people are here.</p><small>Little laughs, lighter days, and the kind of company that just gets it.</small><button onClick={() => setPage("Tribe")}>Find your people <span>↗</span></button></div>
        <div className="mini-profile"><img className="avatar" src={currentAvatar} alt="Your profile" /><div className="identity"><b>{currentName}</b><small>{sessionUser ? "Your profile" : "Local demo profile"}</small></div>{sessionUser ? <button className="icon-button" title="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button> : <button className="text-action" onClick={() => showAuth("signup")}>Join</button>}</div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark"><Sparkles size={16} /></div><b>VIBE WITH TRIBE</b></div>
          <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, vibes, hashtags..." aria-label="Search" />{search && <button className="icon-button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>
          <div className="top-actions"><button className="icon-button pink" title="Notifications" onClick={() => setPage("Notifications")}><Bell size={18} /></button><button className="create-button" onClick={() => { setModal("post"); setMediaFile(null); setMediaPreview(""); }}><Plus size={17} /><span>Create</span></button><button className="icon-button profile-top" title="Your profile" onClick={() => setPage("Profile")}><img className="avatar small" src={currentAvatar} alt="" /></button></div>
        </header>

        <div className="page-grid">
          <section className="feed-column">
            {section === "Home" && <>
              <div className="welcome-row"><div><div className="eyebrow">A little good energy, daily</div><h1>Hey, {currentName.split(/[._]/)[0]} <em>✦</em></h1></div><span className="muted">Your people, your pace.</span></div>
              <Stories stories={stories} currentAvatar={currentAvatar} onAdd={() => { setModal("story"); }} onOpen={openStory} />
              <div className="feed-divider" />
              {visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} onLike={() => void toggleLike(post)} onSave={() => toggleSave(post.id)} onComment={() => { setSelectedPost(post.id); setModal("comment"); }} onShare={() => void sharePost(post)} onProfile={() => setPage("Profile")} onFollow={() => void toggleFollow(post.username)} onEdit={canManageLocalPost(post) ? () => openEditLocalPost(post) : undefined} onDelete={canManageLocalPost(post) ? () => deleteLocalPost(post) : undefined} following={following.includes(post.username)} />) : <EmptyState title="No posts found" text="Try a different search, or be the first to drop a little joy into the feed." />}
            </>}
            {section === "Explore" && <ExplorePage query={search} posts={posts} onLike={toggleLike} onOpen={(post) => { setSelectedPost(post.id); setModal("comment"); }} onSelect={(next) => setPage(next)} />}
            {section === "Reels" && <ReelsPage posts={posts} onLike={toggleLike} onFollow={toggleFollow} following={following} onShare={sharePost} onComment={(post) => { setSelectedPost(post.id); setModal("comment"); }} onUpload={(file) => { setMediaFile(file); setMediaPreview(URL.createObjectURL(file)); setModal("post"); }} />}
            {section === "Comedy zone" && <ComedyPage posts={visiblePosts} onLike={toggleLike} onSave={toggleSave} onShare={sharePost} onFollow={toggleFollow} following={following} onComment={(post) => { setSelectedPost(post.id); setModal("comment"); }} onCreate={() => setModal("post")} onEditPost={openEditLocalPost} onDeletePost={deleteLocalPost} canManageLocalPost={canManageLocalPost} />}
            {section === "Messages" && <ChatPage chatName={chatName} setChatName={setChatName} messages={messages} text={chatText} setText={setChatText} onSend={sendMessage} />}
            {section === "Games" && <GamesPage gameIndex={gameIndex} setGameIndex={setGameIndex} gameChoice={gameChoice} setGameChoice={setGameChoice} score={gameScore} onAnswer={() => { if (!gameChoice) return; setGameScore((score) => score + 1); notify("Nice one. You earned a point!"); setGameChoice(""); setGameIndex((index) => (index + 1) % gamePrompts.length); }} />}
            {section === "Take a breath" && <CalmPage mood={mood} setMood={setMood} quoteIndex={quoteIndex} setQuoteIndex={setQuoteIndex} onComedy={() => setPage("Comedy zone")} />}
            {section === "Tribe" && <TribePage onCreate={() => setModal("community")} notify={notify} createdCommunities={createdCommunities} />}
            {section === "Notifications" && <NotificationsPage onProfile={() => setPage("Profile")} onMessages={() => setPage("Messages")} />}
            {section === "Profile" && <><input ref={avatarInput} type="file" accept="image/*" hidden onChange={(event) => void updateAvatar(event.target.files?.[0])} /><ProfilePage username={currentName} avatar={currentAvatar} bio={profileBio} posts={posts.filter((post) => post.username === currentName || post.username === "you.do.you")} isDemo={!sessionUser} privateAccount={privateAccount} onPrivacy={updatePrivacy} onEdit={() => setModal("edit")} onAuth={() => showAuth("signup")} onSignOut={() => void signOut()} onAvatar={() => avatarInput.current?.click()} /></>}
            {section === "Saved" && <><SectionTitle eyebrow="Your little collection" title="Saved for later" subtitle="Good things, right where you left them." />{visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} onLike={() => void toggleLike(post)} onSave={() => toggleSave(post.id)} onComment={() => { setSelectedPost(post.id); setModal("comment"); }} onShare={() => void sharePost(post)} onProfile={() => setPage("Profile")} onFollow={() => void toggleFollow(post.username)} onEdit={canManageLocalPost(post) ? () => openEditLocalPost(post) : undefined} onDelete={canManageLocalPost(post) ? () => deleteLocalPost(post) : undefined} following={following.includes(post.username)} />) : <EmptyState title="A pocket of good things" text="Save posts from your feed and they’ll be waiting here whenever you need a little inspiration." />}</>}
          </section>
          <aside className="right-column">
            <div className="profile-summary"><img className="avatar" src={currentAvatar} alt="" /><div className="identity"><b>{currentName}</b><small>{sessionUser ? "Your corner, your rules" : "Find your kind of fun"}</small></div><button className="text-action" onClick={() => sessionUser ? setPage("Profile") : showAuth("signup")}>{sessionUser ? "Profile" : "Join"}</button></div>
            <div className="right-panel"><div className="panel-title"><span>People you might vibe with</span><button onClick={() => setPage("Explore")}>See all</button></div>{people.map((person) => <div className="suggestion" key={person.name}><img className="avatar small" src={person.avatar} alt="" /><div className="identity"><b>{person.name}</b><small>{person.note}</small></div><button className="text-action" onClick={() => void toggleFollow(person.name)}>{following.includes(person.name) ? "Following" : "Follow"}</button></div>)}</div>
            <div className="right-panel"><div className="panel-title"><span>Today’s little joys</span><button onClick={() => setPage("Explore")}>Explore</button></div><div className="trend-card"><div className="trend-label"><Flame size={14} /> Trending in your tribe</div><Trend name="#softlaunchyourself" count="2.4k moments" /><Trend name="#tinywins" count="1.8k moments" /><Trend name="#touchgrassclub" count="942 moments" /></div></div>
            <div className="right-panel"><div className="panel-title"><span>A gentle reminder</span><button onClick={() => setPage("Take a breath")}>Breathe</button></div><div className="quote-card" style={{ padding: 16 }}><div className="eyebrow">A note to self</div><blockquote style={{ fontSize: 17, margin: "10px 0" }}>“You don’t have to have it all figured out to enjoy right now.”</blockquote><small>— your calmer corner</small></div></div>
            <p className="footer-note">About · Guidelines · Privacy · Help<br />Made for the moments in between. © 2026 VWT</p>
          </aside>
        </div>
        <nav className="mobile-bottom" aria-label="Mobile navigation">{[{ label: "Home" as Section, icon: Home }, { label: "Explore" as Section, icon: Compass }, { label: "Reels" as Section, icon: Play }, { label: "Messages" as Section, icon: MessageCircle }, { label: "Profile" as Section, icon: UserRound }].map(({ label, icon: Icon }) => <button className={section === label ? "active" : ""} key={label} title={label} onClick={() => setPage(label)}><Icon size={19} /></button>)}</nav>
      </main>

      {modal === "post" && <ModalShell title="Create a little moment" onClose={() => setModal(null)}>
        <form onSubmit={(event) => void createPost(event)}>
          <button className="upload-drop" type="button" onClick={() => fileInput.current?.click()}><ImagePlus size={25} /><b>{mediaFile ? mediaFile.name : "Choose a photo or video"}</b><small>Images up to 10 MB · videos up to 25 MB</small></button>
          <div className="camera-open-row"><button className="secondary-button" type="button" onClick={() => openCamera("post")}><Camera size={15} /> Take a photo</button></div>
          <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => setMedia(event.target.files?.[0])} />
          {mediaPreview && (mediaFile?.type.startsWith("video/") ? <video className="upload-preview" src={mediaPreview} controls /> : <img className="upload-preview" src={mediaPreview} alt="Selected upload preview" />)}
          <label className="form-field">Caption<textarea value={newCaption} onChange={(event) => setNewCaption(event.target.value)} placeholder="What’s the vibe? Add a caption or a little story..." maxLength={800} /></label>
          <div className="draft-actions"><button className="text-action" type="button" onClick={restorePostDraft}>Restore draft</button><button className="text-action" type="button" onClick={savePostDraft}>Save draft</button></div>
          <div className="form-hint">Draft captions stay on this device; selected media files must be chosen again. {supabase && sessionUser ? "Media uses Supabase Storage; post details sync through Convex." : "Posts in demo mode stay in this browser."}</div>
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button><button className="create-button" type="submit" disabled={isSubmittingPost || isUploading}>{isUploading ? "Uploading..." : isSubmittingPost ? "Sharing..." : <><Upload size={14} /> Share post</>}</button></div>
        </form>
      </ModalShell>}
      {modal === "story" && <ModalShell title="Add to your story" onClose={() => setModal(null)}><p className="form-hint">Stories are shown for 24 hours. Choose an image or video from your device.</p><button className="upload-drop" type="button" disabled={isUploading} onClick={() => storyInput.current?.click()}><ImagePlus size={24} /><b>Choose story media</b><small>Image or video · up to 25 MB</small></button><div className="camera-open-row"><button className="secondary-button" type="button" disabled={isUploading} onClick={() => openCamera("story")}><Camera size={15} /> Take a photo</button></div><input ref={storyInput} type="file" accept="image/*,video/*" hidden onChange={(event) => void handleFile(event.target.files?.[0], "story")} />{!isSupabaseConfigured && <p className="form-hint">In demo mode, your story is only visible in this browser.</p>}</ModalShell>}
      {modal === "camera" && <ModalShell title="Take a photo" onClose={() => setModal(cameraTarget)}><CameraCapture onCapture={handleCameraCapture} onCancel={() => setModal(cameraTarget)} /></ModalShell>}
      {modal === "comment" && <ModalShell title="The conversation" onClose={() => setModal(null)}><div className="thread-list">{posts.find((post) => post.id === selectedPost)?.comments.map((comment, index) => <div className="thread-comment" key={`${comment.name}-${index}`}><b>{comment.name}</b><span>{comment.text}</span></div>)}</div><form className="comment-form" onSubmit={(event) => void addComment(event)}><input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a kind thought..." maxLength={300} autoFocus /><button type="submit">Post</button></form></ModalShell>}
      {modal === "edit-post" && editingPost && <ModalShell title="Edit your preview post" onClose={() => { setModal(null); setEditingPost(null); }}><form onSubmit={saveLocalPostEdit}><label className="form-field">Caption<textarea value={editPostCaption} onChange={(event) => setEditPostCaption(event.target.value)} maxLength={800} autoFocus /></label><div className="form-hint">This post is saved only in this browser. Cloud post editing needs an authenticated backend operation.</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setModal(null); setEditingPost(null); }}>Cancel</button><button className="create-button" type="submit">Save changes</button></div></form></ModalShell>}
      {modal === "edit" && <ModalShell title="Make it yours" onClose={() => setModal(null)}><form onSubmit={(event) => void updateProfile(event)}><label className="form-field">Username<input name="name" defaultValue={profileName} minLength={3} maxLength={24} required /></label><label className="form-field">Bio<textarea name="bio" defaultValue={profileBio} maxLength={160} /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button><button className="create-button" type="submit">Save profile</button></div></form><button className="secondary-button" style={{ marginTop: 14 }} onClick={() => { setModal(null); void signOut(); }}><LogOut size={14} /> Sign out</button></ModalShell>}
      {modal === "community" && <ModalShell title="Start a little corner" onClose={() => setModal(null)}><form onSubmit={(event) => void submitCommunity(event)}><label className="form-field">Community name<input name="name" placeholder="e.g. Sunday soft club" required minLength={2} maxLength={60} /></label><label className="form-field">What brings you together?<textarea name="description" required maxLength={240} /></label><label className="form-field" style={{ display: "flex", alignItems: "center", gridTemplateColumns: "auto 1fr" }}><input name="private" type="checkbox" style={{ width: 15 }} /> Private community</label><div className="modal-actions"><button className="secondary-button" type="button" disabled={isCreatingCommunity} onClick={() => setModal(null)}>Cancel</button><button className="create-button" type="submit" disabled={isCreatingCommunity}>{isCreatingCommunity ? "Creating..." : "Create community"}</button></div></form></ModalShell>}
      {selectedStory && <div className="story-viewer" onClick={() => setSelectedStory(null)}>
        <button className="story-close" onClick={() => setSelectedStory(null)} aria-label="Close story"><X size={20} /></button>
        {selectedStory.own && !sessionUser?.id && selectedStory.id.startsWith("story-") && <button className="story-delete" onClick={(event) => { event.stopPropagation(); deleteLocalStory(selectedStory); }} aria-label="Delete my story"><Trash2 size={17} /> Delete story</button>}
        <div className="story-progress"><span /></div>
        <div className="story-viewer-user"><img className="avatar small" src={selectedStory.avatar} alt="" /><b>{selectedStory.username}</b><small>now</small></div>
        {selectedStory.kind === "video" ? <video className="story-viewer-image" src={selectedStory.image} autoPlay controls playsInline /> : <img className="story-viewer-image" src={selectedStory.image} alt={`Story by ${selectedStory.username}`} />}
        <button className="story-reply" onClick={(event) => { event.stopPropagation(); setSelectedStory(null); setSection("Messages"); setChatName(selectedStory.username); setChatText(`Replying to your story ✨ `); notify(`Your reply is ready to send to ${selectedStory.username}.`); }}><span>Reply to {selectedStory.username}...</span><Send size={16} /></button>
      </div>}
      {(isUploading || isSubmittingPost) && <div className="toast" role="status" aria-live="polite">{isUploading ? "Uploading media..." : "Sharing your post..."}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

const cameraFilters = [
  { name: "Natural", value: "none" },
  { name: "Vivid", value: "saturate(1.3) contrast(1.06)" },
  { name: "Vintage", value: "sepia(.42) saturate(1.18)" },
  { name: "Mono", value: "grayscale(1)" },
  { name: "Cool", value: "hue-rotate(12deg) saturate(1.12)" },
];

function CameraCapture({ onCapture, onCancel }: { onCapture: (file: File) => void; onCancel: () => void }) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraRefresh, setCameraRefresh] = useState(0);
  const [filter, setFilter] = useState(cameraFilters[0].value);
  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");
  const [recordedVideo, setRecordedVideo] = useState<{ file: File; url: string } | null>(null);
  const recordingSecondsRef = useRef(0);
  const componentMounted = useRef(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<BlobPart[]>([]);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { componentMounted.current = false; }, []);

  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;
    setIsStarting(true);
    setCameraError("");

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported in this browser. Choose a photo or video file instead.");
        setIsStarting(false);
        return;
      }

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
        });
        if (disposed) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = nextStream;
        if (videoRef.current) videoRef.current.srcObject = nextStream;
      } catch (error) {
        if (disposed) return;
        const name = error instanceof DOMException ? error.name : "";
        setCameraError(name === "NotAllowedError" || name === "SecurityError"
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device. You can choose a photo or video file instead."
            : "The camera could not start. Check browser permission or choose a file instead.");
      } finally {
        if (!disposed) setIsStarting(false);
      }
    };

    void startCamera();
    return () => {
      disposed = true;
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facingMode, cameraRefresh]);

  useEffect(() => () => { if (recordedVideo) URL.revokeObjectURL(recordedVideo.url); }, [recordedVideo]);

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || isCapturing) {
      setCameraError("Wait for the camera preview to be ready, then try again.");
      return;
    }

    setIsCapturing(true);
    setCameraError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the photo.");
      context.filter = filter;
      if (facingMode === "user") {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The photo could not be captured.")), "image/jpeg", .9));
      onCapture(new File([blob], `vwt-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "The photo could not be captured. Please try again.");
      setIsCapturing(false);
    }
  };

  const stopRecording = () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    recordingTimer.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setRecordingError("Video recording is not supported here. You can choose a video file instead.");
      return;
    }

    try {
      const preferredType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recordingChunks.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordingChunks.current.push(event.data); };
      recorder.onerror = () => {
        setRecordingError("The video could not be recorded. Please try again or choose a file.");
        setIsRecording(false);
      };
      recorder.onstop = () => {
        if (!componentMounted.current) return;
        if (recordingTimer.current) clearInterval(recordingTimer.current);
        recordingTimer.current = null;
        setIsRecording(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        const blob = new Blob(recordingChunks.current, { type: recorder.mimeType || "video/webm" });
        recordingChunks.current = [];
        if (blob.size === 0) {
          setRecordingError("No video was captured. Start recording and try again.");
          setCameraRefresh((version) => version + 1);
          return;
        }
        if (blob.size > 25000000) {
          setRecordingError("That recording exceeds the 25 MB video limit. Try a shorter clip.");
          setCameraRefresh((version) => version + 1);
          return;
        }
        const file = new File([blob], `vwt-camera-${Date.now()}.webm`, { type: blob.type || "video/webm" });
        setRecordedVideo({ file, url: URL.createObjectURL(blob) });
      };
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      setRecordingError("");
      setIsRecording(true);
      recorder.start(250);
      recordingTimer.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
        if (recordingSecondsRef.current >= 15) stopRecording();
      }, 1000);
    } catch {
      setIsRecording(false);
      setRecordingError("The camera could not start video recording on this device.");
    }
  };

  const retakeVideo = () => {
    setRecordedVideo(null);
    setRecordingSeconds(0);
    setRecordingError("");
    setCameraRefresh((version) => version + 1);
  };

  return <div className="camera-capture">
    <div className="camera-stage">
      {cameraError ? <div className="camera-error" role="alert"><Camera size={24} /><p>{cameraError}</p></div> : <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" style={{ filter, transform: facingMode === "user" ? "scaleX(-1)" : undefined }} />}
      {isStarting && <div className="camera-loading" role="status"><span className="camera-spinner" />Starting camera...</div>}
      {!cameraError && <span className="camera-permission-note">Camera is active only while this screen is open</span>}
    </div>
    <div className="camera-filters" role="group" aria-label="Photo filters">{cameraFilters.map((item) => <button type="button" key={item.name} aria-pressed={filter === item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.name}</button>)}</div>
    <div className="camera-controls">
      <button type="button" className="secondary-button" onClick={() => setFacingMode((mode) => mode === "environment" ? "user" : "environment")} disabled={isStarting || Boolean(cameraError)}><Camera size={15} /> Flip camera</button>
      <button type="button" className="camera-shutter" onClick={() => void capturePhoto()} aria-label="Capture photo" title="Capture photo" disabled={isStarting || Boolean(cameraError) || isCapturing}><span /></button>
      <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
    </div>
  </div>;
}

function FloatingHearts() {
  const [hearts, setHearts] = useState<{ id: number; left: number; size: number; duration: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    const colors = ["#f7a9d2", "#efddff", "#fff0f7"];
    setHearts(Array.from({ length: 12 }, (_, id) => ({
      id,
      left: Math.random() * 96 + 2,
      size: Math.round(Math.random() * 10 + 9),
      duration: Math.round(Math.random() * 12 + 24),
      delay: Math.random() * 26,
      color: colors[id % colors.length],
    })));
  }, []);

  return <div className="floating-hearts" aria-hidden="true">{hearts.map((heart) => <span key={heart.id} className="floating-heart" style={{ left: `${heart.left}%`, fontSize: `${heart.size}px`, animationDuration: `${heart.duration}s`, animationDelay: `-${heart.delay}s`, color: heart.color }}>♥</span>)}</div>;
}

function Brand() { return <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div><div className="brand-name">VIBE WITH TRIBE</div><div className="brand-tag">More fun. Less stress.</div></div></div>; }

function AuthPage({ mode, setMode, onSubmit, onGoogle, error, message, onClose }: { mode: "login" | "signup" | "reset"; setMode: (mode: "login" | "signup" | "reset") => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onGoogle: () => void; error: string; message: string; onClose: () => void }) {
  const [avatarPreview, setAvatarPreview] = useState("");
  useEffect(() => () => { if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
  const title = mode === "signup" ? "Find your people." : mode === "reset" ? "A fresh start." : "Good to have you back.";
  return <div className="auth-screen"><section className="auth-art"><Brand /><h1>More fun.<br /><em>Less stress.</em></h1><p>Come as you are. Stay for the laughs, little wins, and people who get your vibe.</p></section><section className="auth-panel"><div className="auth-card"><button className="icon-button" onClick={onClose} title="Back to the app"><ArrowLeft size={18} /></button><h2>{title}</h2><p>{mode === "signup" ? "Make a little corner of the internet your own." : mode === "reset" ? "We’ll send you a link to get back in." : "Your people and your favorite little moments are right here."}</p>
    <form onSubmit={onSubmit}>{mode === "signup" && <><label className="form-field">Username<input name="username" placeholder="your.good.vibe" minLength={3} maxLength={24} required autoComplete="username" /></label><label className="form-field">Profile photo <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 5000000) setAvatarPreview(URL.createObjectURL(file)); }} />{avatarPreview && <img className="avatar large" src={avatarPreview} alt="Profile photo preview" />}</label></>}<label className="form-field"><span>Email</span><input name="email" type="email" placeholder="you@example.com" required autoComplete="email" /></label>{mode !== "reset" && <label className="form-field"><span>Password</span><input name="password" type="password" placeholder="At least 8 characters" minLength={8} required autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}{mode === "signup" && <p className="form-hint">Use an image up to 5 MB. Passwords are handled by Supabase Auth when configured.</p>}{error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-success" role="status">{message}</div>}<button className="create-button" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} type="submit">{mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Log in"}</button></form>{mode === "login" && <button style={{ display: "block", margin: "11px auto", border: 0, color: "#d991c7", background: "transparent", fontSize: 11, cursor: "pointer" }} onClick={() => setMode("reset")}>Forgot password?</button>}{mode !== "reset" && <><div className="divider-text">or continue with</div><button className="google-button" type="button" onClick={onGoogle}><span style={{ fontWeight: 800, color: "#f0b4d8" }}>G</span> Continue with Google</button></>}<div className="auth-switch">{mode === "signup" ? <>Already one of us? <button onClick={() => setMode("login")}>Log in</button></> : mode === "reset" ? <>Remembered it? <button onClick={() => setMode("login")}>Log in</button></> : <>New around here? <button onClick={() => setMode("signup")}>Create an account</button></>}</div><p className="form-hint" style={{ textAlign: "center", marginTop: 24 }}>{isSupabaseConfigured ? "Secure sign-in powered by your Supabase project." : "Preview mode: sign-in is local to this browser until Supabase is connected."}</p></div></section></div>;
}

function Stories({ stories, currentAvatar, onAdd, onOpen }: { stories: Story[]; currentAvatar: string; onAdd: () => void; onOpen: (story: Story) => void }) {
  const ownStory = stories.find((story) => story.own);
  return <div className="stories"><button className="story" onClick={() => ownStory ? onOpen(ownStory) : onAdd()}><span className={`story-ring ${ownStory ? "" : "add"}`}>{ownStory ? <img src={ownStory.avatar || currentAvatar} alt="" /> : <Plus size={21} />}</span><span className="story-name">{ownStory ? "Your story" : "Add story"}</span></button>{stories.filter((story) => !story.own).map((story) => <button className="story" key={story.id} onClick={() => onOpen(story)}><span className="story-ring"><img src={story.avatar || currentAvatar} alt="" /></span><span className="story-name">{story.username}</span></button>)}</div>;
}

function PostCard({ post, onLike, onSave, onComment, onShare, onProfile, onFollow, onEdit, onDelete, following }: { post: Post; onLike: () => void; onSave: () => void; onComment: () => void; onShare: () => void; onProfile: () => void; onFollow: () => void; onEdit?: () => void; onDelete?: () => void; following: boolean }) {
  return <article className="post-card"><div className="post-head"><button className="avatar-button" onClick={onProfile}><img className="avatar" src={post.avatar} alt={`${post.username}'s profile`} /></button><button className="identity identity-button" onClick={onProfile}><b>{post.username} <ShieldCheck className="verified" size={12} fill="currentColor" /></b><small>{post.location} · {post.time}</small></button>{post.username !== "you.do.you" && <button className="text-action" onClick={onFollow}>{following ? "Following" : "Follow"}</button>}{onEdit && <button className="icon-button" title="Edit preview post" aria-label="Edit preview post" onClick={onEdit}><Pencil size={15} /></button>}{onDelete && <button className="icon-button" title="Delete preview post" aria-label="Delete preview post" onClick={onDelete}><Trash2 size={15} /></button>}<button className="icon-button" title="More options" onClick={onShare}><MoreHorizontal size={20} /></button></div>{post.kind === "video" ? <video className="post-photo" src={post.image} controls playsInline /> : <img className="post-photo" src={post.image} alt={`Post by ${post.username}`} loading="lazy" />}<div className="post-actions"><button className={`icon-button ${post.liked ? "liked" : ""}`} title={post.liked ? "Unlike" : "Like"} onClick={onLike}><Heart size={20} fill={post.liked ? "currentColor" : "none"} /></button><button className="icon-button" title="Comment" onClick={onComment}><MessageCircle size={19} /></button><button className="icon-button" title="Share" onClick={onShare}><Share2 size={18} /></button><button className={`icon-button push ${post.saved ? "saved" : ""}`} title={post.saved ? "Remove from saved" : "Save post"} onClick={onSave}><Bookmark size={19} fill={post.saved ? "currentColor" : "none"} /></button></div><div className="post-copy"><div className="like-count">{post.likes.toLocaleString()} little loves</div><p className="post-caption"><b>{post.username}</b>{formatCaption(post.caption)}</p><button className="comment-link" onClick={onComment}>View all {post.comments.length} comments</button></div></article>;
}
function formatCaption(text: string) { return text.split(/(#[\w.]+|@[\w.]+)/g).map((part, index) => part.startsWith("#") || part.startsWith("@") ? <span className="tag" key={`${part}-${index}`}>{part}</span> : part); }
function SectionTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) { return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Trend({ name, count }: { name: string; count: string }) { return <div className="trend-item"><div><b>{name}</b><small>{count}</small></div><span className="trend-count">↗</span></div>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><Sparkles size={22} color="#d187d8" /><h3>{title}</h3><p>{text}</p></div>; }
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} title="Close"><X size={18} /></button></div><div className="modal-body">{children}</div></div></div>; }

function ExplorePage({ query, posts, onLike, onOpen, onSelect }: { query: string; posts: Post[]; onLike: (post: Post) => void; onOpen: (post: Post) => void; onSelect: (section: Section) => void }) {
  const filtered = posts.filter((post) => !query || `${post.username} ${post.caption}`.toLowerCase().includes(query.toLowerCase()));
  return <><SectionTitle eyebrow="Find your next favorite" title="Explore" subtitle={query ? `Searching for “${query}”` : "Good people, good ideas, good little distractions."} /><div className="tile-grid"><FeatureTile title="Reels, on repeat" kicker="A quick mood reset" text="Tiny videos, big main-character energy." image={photo("photo-1516280440614-37939bbacd81")} icon={<Play size={18} />} onClick={() => onSelect("Reels")} /><FeatureTile title="Meme therapy" kicker="Comedy club, open 24/7" text="Your daily dose of absolutely unserious." image={photo("photo-1529139574466-a303027c1d8b")} icon={<Laugh size={18} />} onClick={() => onSelect("Comedy zone")} /><FeatureTile title="Soft hours" kicker="Slow down a little" text="Breathing room, kind words, quieter corners." image={photo("photo-1470770841072-f978cf4d019e")} icon={<Wind size={18} />} onClick={() => onSelect("Take a breath")} /><FeatureTile title="Your next circle" kicker="Better together" text="Find your people and make a little space." image={photo("photo-1511632765486-a01980e01a18")} icon={<Users size={18} />} onClick={() => onSelect("Tribe")} /></div><div className="panel-title" style={{ marginTop: 28 }}><span>Made for your feed</span><span>Fresh finds ✦</span></div>{filtered.length ? <div className="explore-grid">{filtered.map((post) => <button className="explore-post" key={post.id} onClick={() => onOpen(post)}><img src={post.image} alt={`Post by ${post.username}`} /><span><Heart size={15} fill="currentColor" /> {post.likes.toLocaleString()}</span></button>)}</div> : <EmptyState title="No matches yet" text="Try a person, caption, or hashtag. Your next favorite is out there." />}</>;
}

function FeatureTile({ title, kicker, text, image, icon, onClick }: { title: string; kicker: string; text: string; image: string; icon: React.ReactNode; onClick: () => void }) { return <button className="feature-tile" style={{ backgroundImage: `url("${image}")` }} onClick={onClick}><span className="tile-icon">{icon}</span><span className="tile-kicker">{kicker}</span><h3>{title}</h3><p>{text}</p></button>; }

function ReelsPage({ posts, onLike, onFollow, following, onShare, onComment, onUpload }: { posts: Post[]; onLike: (post: Post) => void; onFollow: (name: string) => void; following: string[]; onShare: (post: Post) => void; onComment: (post: Post) => void; onUpload: (file: File) => void }) {
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const uploadInput = useRef<HTMLInputElement>(null);
  const reels = posts.filter((post) => post.kind === "video");
  return <><SectionTitle eyebrow="Little clips, instant lift" title="Reels" subtitle="Short videos from your tribe." action={<><input ref={uploadInput} type="file" hidden accept="video/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /><button className="pill-button reel-upload" onClick={() => uploadInput.current?.click()}><Upload size={13} /> Upload</button></>} />{reels.length ? <div className="reels-stack">{reels.map((post, index) => <article className="reel-card" key={post.id}><video src={post.image} controls playsInline loop /><div className="reel-shade" /><div className="reel-top"><span><Play size={13} fill="currentColor" /> YOUR TRIBE</span></div><div className="reel-info"><b>@{post.username} <ShieldCheck size={13} fill="currentColor" /></b><p>{post.caption}</p><span><Music2 size={12} /> original audio</span></div><div className="reel-actions"><button onClick={() => onLike(post)}><Heart size={21} fill={post.liked ? "#ff5b9d" : "none"} color={post.liked ? "#ff5b9d" : "white"} /><small>{post.likes.toLocaleString()}</small></button><button onClick={() => onComment(post)}><MessageCircle size={21} /><small>{post.comments.length}</small></button><button onClick={() => onShare(post)}><Share2 size={20} /><small>Share</small></button><button onClick={() => onFollow(post.username)}><Users size={20} /><small>{following.includes(post.username) ? "Following" : "Follow"}</small></button></div><div className="reel-index">{String(index + 1).padStart(2, "0")} / {String(reels.length).padStart(2, "0")}</div></article>)}</div> : <EmptyState title="Your first reel goes here" text="There are no shared videos in this preview yet. Add a short video to start your reel feed." />}</>;
}

function ComedyPage({ posts, onLike, onSave, onShare, onFollow, following, onComment, onCreate, onEditPost, onDeletePost, canManageLocalPost }: { posts: Post[]; onLike: (post: Post) => void; onSave: (id: string) => void; onShare: (post: Post) => void; onFollow: (username: string) => void; following: string[]; onComment: (post: Post) => void; onCreate: () => void; onEditPost: (post: Post) => void; onDeletePost: (post: Post) => void; canManageLocalPost: (post: Post) => boolean }) {
  const [jokeIndex, setJokeIndex] = useState(0);
  return <><SectionTitle eyebrow="Certified unserious zone" title="Comedy club" subtitle="Laugh a little. It counts as self-care." action={<button className="create-button" onClick={onCreate}><Plus size={15} /><span>Post a laugh</span></button>} /><div className="joke-card"><span className="trend-label"><Laugh size={15} /> TODAY’S QUICK LAUGH</span><p>{jokes[jokeIndex]}</p><button className="pill-button" onClick={() => setJokeIndex((index) => (index + 1) % jokes.length)}>Another one <span>↗</span></button></div><div className="panel-title" style={{ marginTop: 22 }}><span>Funny things from your tribe</span><span>All smiles</span></div>{posts.length ? posts.map((post) => <PostCard key={post.id} post={post} onLike={() => onLike(post)} onSave={() => onSave(post.id)} onComment={() => onComment(post)} onShare={() => onShare(post)} onProfile={() => {}} onFollow={() => onFollow(post.username)} onEdit={canManageLocalPost(post) ? () => onEditPost(post) : undefined} onDelete={canManageLocalPost(post) ? () => onDeletePost(post) : undefined} following={following.includes(post.username)} />) : <EmptyState title="The joke is on its way" text="No comedy posts match yet. Share a meme, your best joke, or something that made you laugh." />}</>;
}

function ChatPage({ chatName, setChatName, messages, text, setText, onSend }: { chatName: string; setChatName: (name: string) => void; messages: Record<string, string[]>; text: string; setText: (text: string) => void; onSend: (event: FormEvent) => void }) {
  return <><SectionTitle eyebrow="Good people, good conversations" title="Messages" subtitle="A little hello can go a long way." /><div className="chat-layout"><div className="chat-list">{people.map((person) => <button className={`chat-person ${chatName === person.name ? "active" : ""}`} key={person.name} onClick={() => setChatName(person.name)}><img className="avatar small" src={person.avatar} alt="" /><span className="identity"><b>{person.name}</b><small>{person.note}</small></span></button>)}</div><div className="chat-room"><div className="chat-room-head"><img className="avatar small" src={people.find((person) => person.name === chatName)?.avatar ?? avatars[0]} alt="" /><div className="identity"><b>{chatName}</b><small>Preview conversation</small></div></div><div className="chat-messages">{(messages[chatName] ?? []).map((entry, index) => { const mine = entry.startsWith("__mine__:"); const message = mine ? entry.slice(9) : entry; return <div className={`bubble ${mine ? "mine" : ""}`} key={`${index}-${entry}`}>{message}</div>; })}{!messages[chatName]?.length && <small className="muted">Start a conversation with a kind hello.</small>}</div><form className="chat-compose" onSubmit={onSend}><input value={text} onChange={(event) => setText(event.target.value)} placeholder={`Message ${chatName}...`} aria-label="Message" /><button className="send-button" aria-label="Send message" type="submit"><Send size={16} /></button></form></div></div><p className="form-hint">Sample conversations are local previews. Signed-in chats use Supabase Realtime when the recipient has an account.</p></>;
}

function GamesPage({ gameIndex, setGameIndex, gameChoice, setGameChoice, score, onAnswer }: { gameIndex: number; setGameIndex: (index: number) => void; gameChoice: string; setGameChoice: (choice: string) => void; score: number; onAnswer: () => void }) {
  const prompt = gamePrompts[gameIndex];
  return <><SectionTitle eyebrow="Play a tiny game, stay a little longer" title="Fun & games" subtitle="No stakes. Just good questions and weird little wins." action={<span className="score-pill"><Sparkles size={13} /> {score} joy points</span>} /><div className="games-list"><div className="game-prompt"><span className="eyebrow">{prompt.title}</span><br />{prompt.prompt}</div><div className="choice-list">{prompt.choices.map((choice) => <button className={`choice-button ${gameChoice === choice ? "selected" : ""}`} key={choice} onClick={() => setGameChoice(choice)}>{choice}</button>)}</div><div className="game-controls"><button className="secondary-button" onClick={() => { setGameChoice(""); setGameIndex((gameIndex + 1) % gamePrompts.length); }}>Skip this one</button><button className="create-button" onClick={onAnswer} disabled={!gameChoice}><Check size={14} /> Lock it in</button></div><p className="form-hint">Pick an answer to collect a joy point. Your choice is just for fun and isn’t shared.</p><div className="tile-grid" style={{ marginTop: 24 }}><GameMini emoji="🎭" title="Truth or dare" subtitle="Get to know your people" onClick={() => { setGameIndex(1); setGameChoice(""); }} /><GameMini emoji="🧠" title="Emoji decode" subtitle="Guess the movie or song" onClick={() => { setGameIndex(3); setGameChoice(""); }} /><GameMini emoji="🥂" title="Never have I ever" subtitle="The low-stakes edition" onClick={() => { setGameIndex(2); setGameChoice(""); }} /><GameMini emoji="💭" title="Would you rather" subtitle="Impossible little choices" onClick={() => { setGameIndex(0); setGameChoice(""); }} /></div></div></>;
}
function GameMini({ emoji, title, subtitle, onClick }: { emoji: string; title: string; subtitle: string; onClick: () => void }) { return <button className="game-row" onClick={onClick}><span className="game-emoji">{emoji}</span><span className="identity"><b>{title}</b><small>{subtitle}</small></span><ChevronDown size={15} /></button>; }

function CalmPage({ mood, setMood, quoteIndex, setQuoteIndex, onComedy }: { mood: string; setMood: (mood: string) => void; quoteIndex: number; setQuoteIndex: (index: number) => void; onComedy: () => void }) {
  const [breathing, setBreathing] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const ambient = useRef<{ context: AudioContext; noise: AudioBufferSourceNode; tone: OscillatorNode; gain: GainNode; toneGain: GainNode } | null>(null);
  const quotes = ["You don’t have to earn your rest.", "Little by little is still forward.", "You are allowed to be a work in progress and still be proud."];
  const moods = [{ icon: "🌧️", label: "Low" }, { icon: "🌫️", label: "Meh" }, { icon: "🌤️", label: "Okay" }, { icon: "🌿", label: "Good" }, { icon: "✨", label: "Great" }];
  useEffect(() => () => { void ambient.current?.context.close(); }, []);
  const toggleAmbient = async () => {
    if (ambient.current) {
      const audio = ambient.current; audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, .18); audio.toneGain.gain.setTargetAtTime(0, audio.context.currentTime, .18); audio.noise.stop(audio.context.currentTime + .7); audio.tone.stop(audio.context.currentTime + .7); ambient.current = null; setMusicPlaying(false); window.setTimeout(() => void audio.context.close(), 800); return;
    }
    const context = new AudioContext();
    await context.resume();
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * .28;
    const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    const filter = context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 580;
    const gain = context.createGain(); gain.gain.value = .075;
    const tone = context.createOscillator(); tone.type = "sine"; tone.frequency.value = 174.61;
    const toneGain = context.createGain(); toneGain.gain.value = .015;
    noise.connect(filter); filter.connect(gain); gain.connect(context.destination); tone.connect(toneGain); toneGain.connect(context.destination);
    noise.start(); tone.start(); ambient.current = { context, noise, tone, gain, toneGain }; setMusicPlaying(true);
  };
  return <><SectionTitle eyebrow="Put the scroll down, gently" title="Take a breath" subtitle="A small pause, right when you need it." /><div className="calm-section"><div className="breath-orb" style={{ animationPlayState: breathing ? "running" : "paused" }}><span>{breathing ? "breathe in…" : "you’re here"}</span></div><div style={{ display: "flex", justifyContent: "center", gap: 9 }}><button className="create-button" onClick={() => setBreathing(!breathing)}><Wind size={15} /> {breathing ? "Pause breathing" : "Start breathing"}</button><button className="secondary-button" onClick={onComedy}><Laugh size={14} /> Need a laugh</button></div><p className="form-hint" style={{ textAlign: "center" }}>Breathe in as the circle grows, out as it softens. There’s no wrong way.</p></div><div className="panel-title" style={{ marginTop: 28 }}><span>How are you arriving today?</span><span>{mood ? "Saved privately" : "Just for you"}</span></div><div className="mood-row">{moods.map((item) => <button className={`mood-button ${mood === item.label ? "selected" : ""}`} onClick={() => setMood(item.label)} key={item.label}><span>{item.icon}</span><small>{item.label}</small></button>)}</div><div className="quote-card" style={{ marginTop: 22 }}><div className="eyebrow">A little note for today</div><blockquote>“{quotes[quoteIndex]}”</blockquote><small>From your calmer corner</small><button className="icon-button pink" title="Another quote" style={{ float: "right" }} onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}><Sparkles size={17} /></button></div><div className="panel-title" style={{ marginTop: 23 }}><span>Sounds for slower moments</span></div><div className="music-row"><div className="game-emoji"><Music2 size={20} /></div><div className="identity"><b>Rain, very quietly</b><small>Generated ambience · plays on this device</small></div><button className="pill-button" onClick={() => void toggleAmbient()}>{musicPlaying ? <Pause size={13} /> : <Play size={13} />}{musicPlaying ? "Pause" : "Play"}</button></div><p className="form-hint">A soft rain texture and low tone are generated in your browser. Audio starts only when you press play.</p></>;
}

function TribePage({ onCreate, notify, createdCommunities }: { onCreate: () => void; notify: (text: string) => void; createdCommunities: CommunityPreview[] }) {
  const communities = [{ emoji: "🪴", name: "The Soft Hours Club", members: "2.1k members", desc: "For doing a little less, a little more gently.", tag: "WELLNESS" }, { emoji: "🎞️", name: "Meme Department", members: "8.4k members", desc: "Very important research into very silly things.", tag: "COMEDY" }, { emoji: "📷", name: "Weekend, Somewhere", members: "3.7k members", desc: "Photo walks, spontaneous plans, and good light.", tag: "LOCAL LIFE" }, { emoji: "🎧", name: "Songs for the Group Chat", members: "1.2k members", desc: "Trade tracks that feel like a warm hug.", tag: "MUSIC" }];
  const [joined, setJoined] = useState<string[]>(() => savedValue("vwt-joined-communities", []));
  const toggleJoined = (name: string) => setJoined((items) => {
    const next = items.includes(name) ? items.filter((item) => item !== name) : [...items, name];
    localStorage.setItem("vwt-joined-communities", JSON.stringify(next));
    return next;
  });
  return <><SectionTitle eyebrow="Find a corner that feels like yours" title="Your tribe" subtitle="Little communities for all the things that make you, you." action={<button className="create-button" onClick={onCreate}><Plus size={15} /><span>Create group</span></button>} /><div className="tribe-banner"><div><div className="eyebrow">Better together</div><h2>Find your people.</h2><p>Join a conversation, start a new ritual, or just lurk until it feels like home.</p></div><Users size={40} /></div><div className="panel-title" style={{ marginTop: 22 }}><span>Communities for your vibe</span><button onClick={() => notify("Showing communities picked for you.")}>For you</button></div><div className="community-list">{createdCommunities.map((group) => <div className="community-row" key={group.id}><span className="game-emoji">🌱</span><div className="identity"><small>YOUR CORNER</small><b>{group.name}</b><span>{group.description}</span><small>Created by you</small></div></div>)}{communities.map((group) => <div className="community-row" key={group.name}><span className="game-emoji">{group.emoji}</span><div className="identity"><small>{group.tag}</small><b>{group.name}</b><span>{group.desc}</span><small>{group.members}</small></div><button className="pill-button" onClick={() => toggleJoined(group.name)}>{joined.includes(group.name) ? "Joined ✓" : "Join"}</button></div>)}</div><p className="form-hint">Community examples are preview content. Your joins are saved on this device; shared membership needs a configured account.</p></>;
}

function NotificationsPage({ onProfile, onMessages }: { onProfile: () => void; onMessages: () => void }) {
  const items = [{ icon: Heart, text: <><b>nina.jpg</b> and <b>12 others</b> liked your post.</>, time: "4m", avatar: avatars[4], action: onProfile }, { icon: Users, text: <><b>lex.you</b> started following you.</>, time: "25m", avatar: avatars[1], action: onProfile }, { icon: MessageCircle, text: <><b>theweekendclub</b> sent you a message.</>, time: "1h", avatar: avatars[2], action: onMessages }, { icon: Smile, text: <><b>mila.moon</b> reacted to your story with ✨</>, time: "3h", avatar: avatars[0], action: onProfile }, { icon: Users, text: <>You might like <b>The Soft Hours Club</b>.</>, time: "1d", avatar: avatars[5], action: onProfile }];
  return <><SectionTitle eyebrow="Little pings from your people" title="Notifications" subtitle="Sample activity for this preview. Live account notifications are not configured." /><div className="notification-list">{items.map((item, index) => <button className="notification-row" key={index} onClick={item.action}><img className="avatar" src={item.avatar} alt="" /><span className="notification-copy">{item.text}<small>{item.time}</small></span><item.icon size={17} color="#e883c0" /></button>)}</div></>;
}

function ProfilePage({ username, avatar, bio, posts, isDemo, privateAccount, onPrivacy, onEdit, onAuth, onSignOut, onAvatar }: { username: string; avatar: string; bio: string; posts: Post[]; isDemo: boolean; privateAccount: boolean; onPrivacy: (value: boolean) => void; onEdit: () => void; onAuth: () => void; onSignOut: () => void; onAvatar: () => void }) {
  const [tab, setTab] = useState("Posts");
  const visiblePosts = tab === "Reels" ? posts.filter((post) => post.kind === "video") : tab === "Saved" ? posts.filter((post) => post.saved) : posts;
  return <><div className="profile-cover" /><div className="profile-header"><button className="profile-avatar-wrap" onClick={onAvatar} title="Change profile photo"><img className="avatar large" src={avatar} alt="Profile" /><span><ImagePlus size={13} /></span></button><div className="identity"><b>{username}</b><small>{isDemo ? "Local preview profile" : "Vibe curator ✦"}</small></div>{isDemo ? <button className="pill-button" onClick={onAuth}>Create account</button> : <button className="pill-button" onClick={onEdit}>Edit profile</button>}</div><div className="profile-stats"><div><b>{posts.length}</b><small>posts</small></div><div><b>248</b><small>followers</small></div><div><b>312</b><small>following</small></div></div><p className="profile-bio">{bio}</p><label className="privacy-toggle"><span><LockKeyhole size={14} /> Private account</span><input type="checkbox" checked={privateAccount} onChange={(event) => onPrivacy(event.target.checked)} /><i /></label><div className="profile-tabs">{["Posts", "Reels", "Saved"].map((name) => <button key={name} style={{ color: tab === name ? "#f19acb" : undefined }} onClick={() => setTab(name)}>{name}</button>)}</div>{visiblePosts.length ? <div className="profile-post-grid">{visiblePosts.map((post) => <img key={post.id} src={post.image} alt={`Post by ${username}`} />)}</div> : <EmptyState title={tab === "Posts" ? "Your story starts here" : `No ${tab.toLowerCase()} yet`} text={tab === "Posts" ? "Share a moment, a laugh, or a tiny win. Your profile is your corner." : "This section will fill in as you share and save moments."} />}<button className="secondary-button" style={{ marginTop: 20 }} onClick={isDemo ? onAuth : onSignOut}>{isDemo ? <><LockKeyhole size={14} /> Set up your secure account</> : <><LogOut size={14} /> Sign out</>}</button></>;
}
