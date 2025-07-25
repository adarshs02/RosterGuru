"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, RotateCcw, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatMultipliers, DEFAULT_MULTIPLIERS } from '@/lib/zscoreCalculator'

interface ZScoreMultiplierEditorProps {
  multipliers: StatMultipliers
  onMultipliersChange: (multipliers: StatMultipliers) => void
  disabled?: boolean
}

export default function ZScoreMultiplierEditor({
  multipliers,
  onMultipliersChange,
  disabled = false
}: ZScoreMultiplierEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempMultipliers, setTempMultipliers] = useState<StatMultipliers>(multipliers)

  const handleSave = () => {
    onMultipliersChange(tempMultipliers)
    setIsOpen(false)
  }

  const handleReset = () => {
    setTempMultipliers(DEFAULT_MULTIPLIERS)
  }

  const handleCancel = () => {
    setTempMultipliers(multipliers) // Reset to current values
    setIsOpen(false)
  }

  const updateMultiplier = (stat: keyof StatMultipliers, value: string) => {
    const numValue = parseFloat(value) || 0
    setTempMultipliers(prev => ({
      ...prev,
      [stat]: numValue
    }))
  }

  const isCustomized = JSON.stringify(multipliers) !== JSON.stringify(DEFAULT_MULTIPLIERS)

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant={isCustomized ? "default" : "outline"} 
            size="sm" 
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Z-Score Weights
            {isCustomized && <Badge variant="secondary" className="ml-1">Custom</Badge>}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Customize Z-Score Multipliers
            </DialogTitle>
            <DialogDescription>
              Adjust the weight of each statistic in the overall z-score calculation. 
              Higher values mean the stat has more impact on the final score.
            </DialogDescription>
          </DialogHeader>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">How it works</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Each player's individual stat z-scores are multiplied by your weights, then averaged to create a custom total z-score. 
                This allows you to emphasize stats that matter most for your analysis.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Positive stats */}
            <div className="space-y-4">
              <h4 className="font-semibold text-green-700">Positive Impact Stats</h4>
              
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.points}
                  onChange={(e) => updateMultiplier('points', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rebounds">Rebounds</Label>
                <Input
                  id="rebounds"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.rebounds}
                  onChange={(e) => updateMultiplier('rebounds', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assists">Assists</Label>
                <Input
                  id="assists"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.assists}
                  onChange={(e) => updateMultiplier('assists', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="steals">Steals</Label>
                <Input
                  id="steals"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.steals}
                  onChange={(e) => updateMultiplier('steals', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blocks">Blocks</Label>
                <Input
                  id="blocks"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.blocks}
                  onChange={(e) => updateMultiplier('blocks', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Shooting stats & turnovers */}
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-700">Shooting & Efficiency</h4>
              
              <div className="space-y-2">
                <Label htmlFor="field_goal_percentage">Field Goal %</Label>
                <Input
                  id="field_goal_percentage"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.field_goal_percentage}
                  onChange={(e) => updateMultiplier('field_goal_percentage', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="free_throw_percentage">Free Throw %</Label>
                <Input
                  id="free_throw_percentage"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.free_throw_percentage}
                  onChange={(e) => updateMultiplier('free_throw_percentage', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="three_pointers_made">3-Pointers Made</Label>
                <Input
                  id="three_pointers_made"
                  type="number"
                  step="0.1"
                  value={tempMultipliers.three_pointers_made}
                  onChange={(e) => updateMultiplier('three_pointers_made', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-red-700">Negative Impact</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="turnovers">
                    Turnovers (weight)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Higher values penalize turnovers more heavily. The actual multiplier applied will be negative.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="turnovers"
                    type="number"
                    step="0.1"
                    value={Math.abs(tempMultipliers.turnovers)}
                    onChange={(e) => updateMultiplier('turnovers', `-${e.target.value}`)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
