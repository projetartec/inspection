
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"
import useEmblaCarousel, {
  type EmblaCarouselType,
  type EmblaOptionsType,
} from "embla-carousel-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  showNavButtons?: boolean
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showNavButtons = false,
  ...props
}: CalendarProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    dragFree: false,
    containScroll: "trimSnaps",
  })
  const [prevBtnDisabled, setPrevBtnDisabled] = React.useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = React.useState(true)

  const onSelect = React.useCallback((emblaApi: EmblaCarouselType) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev())
    setNextBtnDisabled(!emblaApi.canScrollNext())
  }, [])

  React.useEffect(() => {
    if (!emblaApi) return
    onSelect(emblaApi)
    emblaApi.on("reInit", onSelect)
    emblaApi.on("select", onSelect)
  }, [emblaApi, onSelect])

  return (
    <div className="relative">
      <style>{`
        .embla__month {
          flex: 0 0 100%;
          min-width: 0;
        }
      `}</style>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex overflow-hidden",
          month:
            "embla__month w-full space-y-4 focus-visible:outline-none [&:has([name=caption-dropdowns])]:-mt-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium hidden", // Hide default label
          caption_dropdowns: "flex items-center gap-1.5",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Months: ({ children }) => (
            <div className="embla" ref={emblaRef}>
              {children}
            </div>
          ),
          Dropdown: ({
            value,
            onChange,
            children,
            "aria-label": ariaLabel,
          }: DropdownProps) => {
            const options = React.Children.toArray(
              children
            ) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[]
            const selected = options.find((child) => child.props.value === value)
            const handleChange = (value: string) => {
              const changeEvent = {
                target: { value },
              } as React.ChangeEvent<HTMLSelectElement>
              onChange?.(changeEvent)
            }
            return (
              <Select
                value={value?.toString()}
                onValueChange={(value) => {
                  handleChange(value)
                }}
              >
                <SelectTrigger
                  aria-label={ariaLabel}
                  className="h-8 w-fit min-w-24 px-2 py-1"
                >
                  <SelectValue>{selected?.props?.children}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {options.map((option, id: number) => (
                    <SelectItem
                      key={`${option.props.value}-${id}`}
                      value={option.props.value?.toString() ?? ""}
                    >
                      {option.props.children}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          },
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
        captionLayout="dropdown-buttons"
        fromYear={2015}
        toYear={2040}
        {...props}
      />
      {showNavButtons && (
        <div className="absolute top-[0.6rem] flex w-full items-center justify-center gap-1.5">
          <Button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={prevBtnDisabled}
            variant="outline"
            size="icon"
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button
            onClick={() => emblaApi?.scrollNext()}
            disabled={nextBtnDisabled}
            variant="outline"
            size="icon"
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
