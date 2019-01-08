import { color, Flex, Join, Link, Spacer } from "@artsy/palette"
import { ArtworkActions_artwork } from "__generated__/ArtworkActions_artwork.graphql"
import { track } from "Artsy/Analytics"
import * as Schema from "Artsy/Analytics/Schema"
import { ContextConsumer } from "Artsy/SystemContext"
import { Bell, Download, Edit, Genome, Heart, Share } from "Assets/SVGIcons"
import SaveButton, { SaveProps, SaveState } from "Components/Artwork/Save"
import { compact } from "lodash"
import { isNull } from "lodash"
import React from "react"
import { createFragmentContainer, graphql } from "react-relay"
import { data as sd } from "sharify"
import styled from "styled-components"
import { slugify } from "underscore.string"
import { ArtworkSharePanelFragmentContainer as ArtworkSharePanel } from "./ArtworkSharePanel"

interface ArtworkActionsProps {
  artwork: ArtworkActions_artwork
  user?: User
}

interface ArtworkActionsState {
  showSharePanel: boolean
}

@track({
  context_module: Schema.ContextModule.ShareButton,
})
export class ArtworkActions extends React.Component<
  ArtworkActionsProps,
  ArtworkActionsState
> {
  state = {
    showSharePanel: false,
  }

  @track({
    flow: Schema.Flow.ArtworkShare,
    action_type: Schema.ActionType.Click,
    type: Schema.Type.Button,
  })
  toggleSharePanel() {
    const showSharePanel = !this.state.showSharePanel
    this.setState({
      showSharePanel,
    })
  }

  get isAdmin() {
    const isAdmin = this.props.user && this.props.user.type === "Admin"
    return isAdmin
  }

  getDownloadableImageUrl() {
    const {
      artwork: { is_downloadable, href, artists, title, date },
    } = this.props

    const canDownload = is_downloadable || this.isAdmin

    if (canDownload) {
      const artistNames = artists.map(({ name }) => name).join(", ")
      const filename = slugify(compact([artistNames, title, date]).join(" "))
      const downloadableImageUrl = `${sd.APP_URL}${href}/download/${filename}.jpg` // prettier-ignore
      return downloadableImageUrl
    } else {
      return false
    }
  }

  render() {
    const { artwork } = this.props
    const downloadableImageUrl = this.getDownloadableImageUrl()
    const editUrl = `${sd.CMS_URL}/artworks/${artwork.id}/edit?current_partner_id=${artwork.partner.id}` // prettier-ignore
    const genomeUrl = `${sd.GENOME_URL}/genome/artworks?artwork_ids=${artwork.id}` // prettier-ignore

    return (
      <>
        <Container>
          <Join separator={<Spacer mx={0.5} />}>
            <SaveButton
              artwork={this.props.artwork}
              render={Save(this.props)}
            />
            <UtilButton
              name="share"
              onClick={this.toggleSharePanel.bind(this)}
            />

            {downloadableImageUrl && (
              <UtilButton name="download" link={downloadableImageUrl} />
            )}
            {this.isAdmin && <UtilButton name="edit" link={editUrl} />}
            {this.isAdmin && <UtilButton name="genome" link={genomeUrl} />}
          </Join>

          {this.state.showSharePanel && (
            <ArtworkSharePanel
              artwork={this.props.artwork}
              onClose={this.toggleSharePanel.bind(this)}
            />
          )}
        </Container>
      </>
    )
  }
}

export const ArtworkActionsFragmentContainer = createFragmentContainer(
  (props: ArtworkActionsProps) => {
    return (
      <ContextConsumer>
        {({ user }) => <ArtworkActions user={user} {...props} />}
      </ContextConsumer>
    )
  },
  graphql`
    fragment ArtworkActions_artwork on Artwork {
      ...Save_artwork
      ...ArtworkSharePanel_artwork

      artists {
        name
      }
      date
      href
      id
      image {
        id
      }
      is_downloadable
      partner {
        id
      }
      title
      sale {
        is_closed
        is_auction
      }
    }
  `
)

interface UtilButtonProps {
  link?: string
  name: "bell" | "edit" | "download" | "genome" | "heart" | "share"
  onClick?: () => void
  selected?: boolean
}

class UtilButton extends React.Component<
  UtilButtonProps,
  { hovered: boolean }
> {
  state = {
    hovered: false,
  }

  render() {
    const { link, name, onClick, ...props } = this.props

    const getIcon = () => {
      switch (name) {
        case "bell":
          return Bell
        case "download":
          return Download
        case "edit":
          return Edit
        case "genome":
          return Genome
        case "heart":
          return Heart
        case "share":
          return Share
      }
    }

    const Icon = getIcon()
    const fill = this.state.hovered ? color("purple100") : color("black100")

    return (
      <UtilButtonContainer
        p={1}
        pt={0}
        onMouseOver={() => this.setState({ hovered: true })}
        onMouseOut={() => this.setState({ hovered: false })}
        onClick={onClick}
      >
        {link ? (
          <Link className="noUnderline" href={link} target="_blank">
            <Icon {...props} fill={fill} />
          </Link>
        ) : (
          <Icon {...props} fill={fill} />
        )}
      </UtilButtonContainer>
    )
  }
}

const UtilButtonContainer = styled(Flex)`
  cursor: pointer;
  justify-content: center;

  &:hover {
    color: ${color("purple100")};
  }
`

const Container = styled(Flex).attrs({
  justifyContent: ["left", "center"],
  mb: [2, 2],
  ml: [-0.5, 1],
  pt: [2, 3],
})`
  position: relative;
  user-select: none;
`

/**
 * Custom renderer for SaveButton
 */
const Save = (actionProps: ArtworkActionsProps) => (
  props: SaveProps,
  state: SaveState
) => {
  // Grab props from ArtworkActions to check if sale is open
  const { sale } = actionProps.artwork
  const isOpenSale = sale && sale.is_auction && !sale.is_closed

  // Check if saved by evaluating props from SaveButton
  const isSaved = isNull(state.is_saved)
    ? props.artwork.is_saved
    : state.is_saved

  // If an Auction, use Bell (for notifications); if a standard artwork use Heart
  if (isOpenSale) {
    return <UtilButton name="bell" selected={isSaved} />
  } else {
    return <UtilButton name="heart" selected={isSaved} />
  }
}
