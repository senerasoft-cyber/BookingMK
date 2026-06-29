import {
  Activity,
  Camera,
  Car,
  Dog,
  Droplet,
  Dumbbell,
  Eye,
  Flower2,
  HandHeart,
  Hand,
  MessageCircleHeart,
  Palette,
  PenTool,
  PersonStanding,
  Scissors,
  Smile,
  Sparkle,
  Sparkles,
  Stethoscope,
  Store,
  Wand2,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  'wand-2': Wand2,
  hand: Hand,
  sparkles: Sparkles,
  eye: Eye,
  palette: Palette,
  'hand-heart': HandHeart,
  'flower-2': Flower2,
  droplet: Droplet,
  activity: Activity,
  smile: Smile,
  stethoscope: Stethoscope,
  sparkle: Sparkle,
  'pen-tool': PenTool,
  'message-circle-heart': MessageCircleHeart,
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
  dog: Dog,
  car: Car,
  camera: Camera,
  'book-open': BookOpen,
  store: Store,
}

export const DEFAULT_ICON_KEY = 'store'

export function getIcon(iconKey: string | null | undefined): LucideIcon {
  return ICONS[iconKey ?? DEFAULT_ICON_KEY] ?? ICONS[DEFAULT_ICON_KEY]
}
